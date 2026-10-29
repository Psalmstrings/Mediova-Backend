const crypto = require('crypto');
const User = require('../models/User');
const InfluencerProfile = require('../models/InfluencerProfile');
const VendorProfile = require('../models/VendorProfile');
const VerificationToken = require('../models/VerificationToken');
const Notification = require('../models/Notification');
const TermsAcceptance = require('../models/TermsAcceptance');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidCountry,
  getCountryMeta,
} = require('../utils/locations');

/**
 * Returns the primary frontend URL for verification and reset links.
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(',').map((u) => u.trim());
    const prodUrl = urls.find((u) => u.startsWith('https://'));
    return prodUrl || urls[0] || 'https://mediova.vercel.app';
  }
  return 'https://mediova.vercel.app';
};

/**
 * Verifies a Google ID token with Google's tokeninfo API
 */
const verifyGoogleToken = async (idToken) => {
  if (!idToken) throw new Error('Google credential token is required');
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google token validation failed: ${errText}`);
  }
  return await response.json();
};

/**
 * @desc    Google OAuth Authentication / Registration
 * @route   POST /api/auth/google
 * @access  Public
 */
const googleAuth = async (req, res, next) => {
  try {
    const { credential, role = 'influencer', profileData } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is missing.' });
    }

    let googlePayload;
    try {
      googlePayload = await verifyGoogleToken(credential);
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired Google authentication credentials. Please try again.',
      });
    }

    const { sub: googleId, email, name, picture } = googlePayload;
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check if account already exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] });

    if (user) {
      // Strict single-role policy: An existing user's role is permanent and cannot be modified.
      // If an existing account belongs to a vendor, it strictly remains a vendor.
      // If an existing account belongs to an influencer, it strictly remains an influencer.

      // Link googleId if missing
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      if (picture && !user.profileImage) {
        user.profileImage = picture;
      }
      await user.save();

      // Check if profile is complete (country, whatsappNumber, termsAccepted)
      const hasWhatsapp = Boolean(user.whatsappNumber || user.phone);
      const isComplete = Boolean(hasWhatsapp && user.country && user.termsAccepted);

      if (!isComplete && profileData) {
        // Complete profile with submitted data
        const { whatsappNumber, country, region, subDivision, area, termsAccepted } = profileData;
        if (termsAccepted) {
          user.termsAccepted = true;
          user.termsAcceptedAt = new Date();
          user.requiresTermsAcceptance = false;
          await TermsAcceptance.create({
            userId: user._id,
            role: user.role,
            source: 'registration',
            declarationType: 'general',
            documentIdentifier: 'terms_and_conditions',
            acceptedAt: new Date(),
            ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
            userAgent: req.headers['user-agent'] || '',
          }).catch(() => {});
        }
        if (whatsappNumber) {
          const norm = normalizePhoneNumber(whatsappNumber);
          user.whatsappNumber = norm;
          user.phone = norm;
        }
        if (country) {
          user.country = country;
          const meta = getCountryMeta(country);
          user.countryCode = meta?.code || 'NG';
        }
        user.location = {
          region: region || user.location?.region || '',
          subDivision: subDivision || user.location?.subDivision || '',
          area: area || user.location?.area || '',
        };
        await user.save();
      }

      let profile = null;
      if (user.role === 'influencer') {
        profile = await InfluencerProfile.findOne({ userId: user._id });
      } else if (user.role === 'vendor') {
        profile = await VendorProfile.findOne({ userId: user._id });
      }

      const token = generateToken(user._id, user.role);
      return res.status(200).json({
        success: true,
        message: 'Google login successful',
        token,
        requiresOnboarding: !isComplete && !profileData,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || user.whatsappNumber,
          whatsappNumber: user.whatsappNumber || user.phone,
          country: user.country,
          countryCode: user.countryCode,
          location: user.location,
          role: user.role,
          profileImage: user.profileImage,
          emailVerified: user.emailVerified,
          accountStatus: user.accountStatus,
          influencerVerificationStatus: user.influencerVerificationStatus,
          termsAccepted: Boolean(user.termsAccepted),
          termsAcceptedAt: user.termsAcceptedAt,
          requiresTermsAcceptance: Boolean(!user.termsAccepted || user.requiresTermsAcceptance),
          profile,
        },
      });
    }

    // User does not exist yet — check if onboarding profileData was submitted
    if (!profileData || !profileData.termsAccepted) {
      return res.status(200).json({
        success: true,
        requiresOnboarding: true,
        googleUser: {
          googleId,
          email: normalizedEmail,
          name,
          picture,
          role,
        },
      });
    }

    // Complete new registration with Google
    const { whatsappNumber, country = 'Nigeria', region = '', subDivision = '', area = '', businessName } = profileData;

    if (!profileData.termsAccepted) {
      return res.status(400).json({
        success: false,
        message: 'You must read and agree to the Terms and Conditions to complete registration.',
      });
    }

    const normWhatsapp = normalizePhoneNumber(whatsappNumber);
    if (!normWhatsapp || !isValidPhoneNumber(normWhatsapp)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid WhatsApp phone number with international calling code.',
      });
    }

    const countryMeta = getCountryMeta(country);

    const newUser = await User.create({
      name: name || 'MEDIOVA Member',
      email: normalizedEmail,
      phone: normWhatsapp,
      whatsappNumber: normWhatsapp,
      country: countryMeta.name,
      countryCode: countryMeta.code,
      location: {
        region: region || '',
        subDivision: subDivision || '',
        area: area || '',
      },
      authProvider: 'google',
      googleId,
      profileImage: picture || '',
      role: ['influencer', 'vendor'].includes(role) ? role : 'influencer',
      emailVerified: true,
      accountStatus: 'active',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      requiresTermsAcceptance: false,
      influencerVerificationStatus: role === 'influencer' ? 'pending' : 'none',
    });

    await TermsAcceptance.create({
      userId: newUser._id,
      role: newUser.role,
      source: 'registration',
      declarationType: 'general',
      documentIdentifier: 'terms_and_conditions',
      acceptedAt: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    }).catch(() => {});

    let newProfile = null;
    if (newUser.role === 'influencer') {
      newProfile = await InfluencerProfile.create({
        userId: newUser._id,
        whatsappNumber: normWhatsapp,
        state: region || 'General',
        city: subDivision || '',
        lga: subDivision || '',
        area: area || 'General',
        verificationStatus: 'pending',
      });
    } else if (newUser.role === 'vendor') {
      newProfile = await VendorProfile.create({
        userId: newUser._id,
        businessName: businessName || name,
        contactPerson: name,
        whatsapp: normWhatsapp,
        phone: normWhatsapp,
        state: region || 'General',
        city: subDivision || '',
        lga: subDivision || '',
        area: area || '',
        verificationStatus: 'verified',
      });
    }

    await Notification.create({
      userId: newUser._id,
      title: 'Welcome to MEDIOVA!',
      message: 'Your MEDIOVA global account has been created via Google.',
      type: 'info',
    });

    const jwtToken = generateToken(newUser._id, newUser.role);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully with Google!',
      token: jwtToken,
      requiresOnboarding: false,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.whatsappNumber,
        whatsappNumber: newUser.whatsappNumber,
        country: newUser.country,
        countryCode: newUser.countryCode,
        location: newUser.location,
        role: newUser.role,
        profileImage: newUser.profileImage,
        emailVerified: true,
        accountStatus: newUser.accountStatus,
        influencerVerificationStatus: newUser.influencerVerificationStatus,
        termsAccepted: true,
        termsAcceptedAt: newUser.termsAcceptedAt,
        requiresTermsAcceptance: false,
        profile: newProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register a new user (Influencer or Vendor via Email/Password)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      whatsappNumber,
      phone, // fallback if sent
      country = 'Nigeria',
      region,
      subDivision,
      area,
      state, // backward compatibility
      lga, // backward compatibility
      termsAccepted,
      // Vendor-specific
      businessName,
      contactPerson,
      businessCategory,
      description,
      businessAddress,
      website,
      socialLinks,
      // Influencer-specific
      categories,
      averageViews,
    } = req.body;

    if (!['influencer', 'vendor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Registration role must be either influencer or vendor.',
      });
    }

    // Backend Terms and Conditions acceptance enforcement
    if (termsAccepted !== true && termsAccepted !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must read and agree to the Terms and Conditions before completing registration.',
      });
    }

    // Backend password complexity validation
    if (
      !password ||
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    // Normalize email
    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    // Single WhatsApp contact number normalization & validation
    const rawNumber = whatsappNumber || phone;
    const normalizedWhatsapp = normalizePhoneNumber(rawNumber);

    if (!normalizedWhatsapp || !isValidPhoneNumber(normalizedWhatsapp)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid WhatsApp contact number with international calling code (e.g. +2348012345678).',
      });
    }

    // Resolve country metadata
    const countryMeta = getCountryMeta(country);
    const resolvedRegion = region || state || 'General';
    const resolvedSubDivision = subDivision || lga || '';
    const resolvedArea = area || 'General';

    // Create user
    const user = await User.create({
      name: (name || '').trim(),
      email: normalizedEmail,
      phone: normalizedWhatsapp,
      whatsappNumber: normalizedWhatsapp,
      country: countryMeta.name,
      countryCode: countryMeta.code,
      location: {
        region: resolvedRegion,
        subDivision: resolvedSubDivision,
        area: resolvedArea,
      },
      password,
      authProvider: 'local',
      role,
      emailVerified: true,
      accountStatus: 'active',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      requiresTermsAcceptance: false,
      influencerVerificationStatus: role === 'influencer' ? 'pending' : 'none',
    });

    await TermsAcceptance.create({
      userId: user._id,
      role: user.role,
      source: 'registration',
      declarationType: 'general',
      documentIdentifier: 'terms_and_conditions',
      acceptedAt: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    }).catch(() => {});

    // Create role-specific profile
    let profile = null;
    if (role === 'influencer') {
      profile = await InfluencerProfile.create({
        userId: user._id,
        whatsappNumber: normalizedWhatsapp,
        state: resolvedRegion,
        city: resolvedSubDivision,
        lga: resolvedSubDivision,
        area: resolvedArea,
        averageViews: Number(averageViews) || 0,
        categories: Array.isArray(categories) ? categories : [],
        verificationStatus: 'pending',
      });
    } else if (role === 'vendor') {
      profile = await VendorProfile.create({
        userId: user._id,
        businessName: businessName || name,
        contactPerson: contactPerson || name,
        businessCategory: businessCategory || 'General Advertising',
        description: description || '',
        phone: normalizedWhatsapp,
        whatsapp: normalizedWhatsapp,
        state: resolvedRegion,
        city: resolvedSubDivision,
        lga: resolvedSubDivision,
        area: resolvedArea,
        businessAddress: businessAddress || '',
        website: website || '',
        socialLinks: socialLinks || {},
        verificationStatus: 'verified',
      });
    }

    await Notification.create({
      userId: user._id,
      title: 'Welcome to MEDIOVA!',
      message: 'Your account has been created successfully. Welcome to MEDIOVA!',
      type: 'info',
    });

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now log in to your dashboard.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.whatsappNumber,
        whatsappNumber: user.whatsappNumber,
        country: user.country,
        countryCode: user.countryCode,
        location: user.location,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        influencerVerificationStatus: user.influencerVerificationStatus,
        termsAccepted: user.termsAccepted,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact platform support.',
      });
    }

    const token = generateToken(user._id, user.role);

    let profile = null;
    if (user.role === 'influencer') {
      profile = await InfluencerProfile.findOne({ userId: user._id });
    } else if (user.role === 'vendor') {
      profile = await VendorProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.whatsappNumber || user.phone,
        whatsappNumber: user.whatsappNumber || user.phone,
        country: user.country || 'Nigeria',
        countryCode: user.countryCode || 'NG',
        location: user.location,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        influencerVerificationStatus: user.influencerVerificationStatus || profile?.verificationStatus || 'pending',
        termsAccepted: Boolean(user.termsAccepted),
        termsAcceptedAt: user.termsAcceptedAt,
        requiresTermsAcceptance: Boolean(!user.termsAccepted || user.requiresTermsAcceptance),
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user & profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profile = null;
    if (user.role === 'influencer') {
      profile = await InfluencerProfile.findOne({ userId: user._id });
    } else if (user.role === 'vendor') {
      profile = await VendorProfile.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.whatsappNumber || user.phone,
        whatsappNumber: user.whatsappNumber || user.phone,
        country: user.country || 'Nigeria',
        countryCode: user.countryCode || 'NG',
        location: user.location,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        influencerVerificationStatus: user.influencerVerificationStatus || profile?.verificationStatus || 'pending',
        termsAccepted: Boolean(user.termsAccepted),
        termsAcceptedAt: user.termsAcceptedAt,
        requiresTermsAcceptance: Boolean(!user.termsAccepted || user.requiresTermsAcceptance),
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify user email via token (Preserved for compatibility)
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Email verification is no longer required on MEDIOVA. You can log in directly.',
  });
};

/**
 * @desc    Resend verification email (Preserved for compatibility)
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Email verification is no longer required on MEDIOVA. You can log in directly.',
  });
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a reset link will be sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const clientUrl = getClientUrl();
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    try {
      const emailContent = emailTemplates.passwordReset({
        name: user.name,
        resetUrl,
      });

      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailErr) {
      console.error('[forgotPassword] Error sending reset email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a reset link will be sent.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register admin account
 * @route   POST /api/auth/admin-register
 * @access  Public (Secret Protected)
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, adminSecret } = req.body;

    const expectedSecret = process.env.ADMIN_INVITE_SECRET || 'DOPTV_ADMIN_ACCESS_2026';
    if (!adminSecret || adminSecret !== expectedSecret) {
      return res.status(403).json({
        success: false,
        message: 'Invalid administrative invitation secret.',
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const adminUser = await User.create({
      name: (name || 'MEDIOVA Admin').trim(),
      email: normalizedEmail,
      password,
      role: 'admin',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      requiresTermsAcceptance: false,
      emailVerified: true,
      accountStatus: 'active',
    });

    const token = generateToken(adminUser._id, 'admin');

    res.status(201).json({
      success: true,
      message: 'Administrative account registered successfully.',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        termsAccepted: true,
        termsAcceptedAt: adminUser.termsAcceptedAt,
        requiresTermsAcceptance: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept Terms and Conditions (Login / Renewed / Declarations)
 * @route   POST /api/auth/accept-terms
 * @access  Private
 */
const acceptTerms = async (req, res, next) => {
  try {
    const { termsAccepted, source = 'login', declarationType = 'general', metadata = {} } = req.body;
    if (termsAccepted !== true && termsAccepted !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'You must explicitly agree to the MEDIOVA Terms and Conditions to proceed.',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    user.termsAccepted = true;
    user.termsAcceptedAt = new Date();
    user.requiresTermsAcceptance = false;
    await user.save();

    const auditRecord = await TermsAcceptance.create({
      userId: user._id,
      role: user.role,
      source: [
        'registration',
        'login',
        'renewed_acceptance',
        'vendor_campaign_declaration',
        'influencer_gig_declaration',
      ].includes(source)
        ? source
        : 'login',
      declarationType: ['general', 'vendor_schedule_a', 'influencer_schedule_b'].includes(declarationType)
        ? declarationType
        : 'general',
      documentIdentifier: 'terms_and_conditions',
      acceptedAt: new Date(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
      metadata,
    });

    res.status(200).json({
      success: true,
      message: 'Terms and Conditions accepted successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        termsAccepted: user.termsAccepted,
        termsAcceptedAt: user.termsAcceptedAt,
        requiresTermsAcceptance: false,
      },
      acceptanceId: auditRecord._id,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  googleAuth,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  registerAdmin,
  acceptTerms,
};
