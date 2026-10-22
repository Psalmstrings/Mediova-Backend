const crypto = require('crypto');
const User = require('../models/User');
const InfluencerProfile = require('../models/InfluencerProfile');
const VendorProfile = require('../models/VendorProfile');
const VerificationToken = require('../models/VerificationToken');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const { normalizePhoneNumber, isValidPhoneNumber } = require('../utils/locations');

/**
 * Returns the primary frontend URL for verification and reset links.
 * Handles comma-separated values in CLIENT_URL (e.g. "https://mediova.vercel.app,http://localhost:5173")
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(',').map((u) => u.trim());
    // Prioritize production HTTPS Vercel domain if present
    const prodUrl = urls.find((u) => u.startsWith('https://'));
    return prodUrl || urls[0] || 'https://mediova.vercel.app';
  }
  return 'https://mediova.vercel.app';
};

/**
 * @desc    Register a new user (Influencer or Vendor)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      // Influencer-specific fields
      whatsappNumber,
      state,
      city,
      lga,
      area,
      additionalAreas,
      averageViews,
      categories,
      // Vendor-specific fields
      businessName,
      contactPerson,
      businessCategory,
      description,
      businessAddress,
      website,
      socialLinks,
    } = req.body;

    if (!['influencer', 'vendor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Registration role must be either influencer or vendor.',
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

    // Normalize phone numbers to international E.164 standard
    const normalizedPhone = normalizePhoneNumber(phone);
    const normalizedWhatsapp = normalizePhoneNumber(whatsappNumber || phone);

    // Create base user - immediately active and verified
    const user = await User.create({
      name: (name || '').trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role,
      emailVerified: true,
      accountStatus: 'active',
    });

    // Create role-specific profile
    let profile = null;
    if (role === 'influencer') {
      profile = await InfluencerProfile.create({
        userId: user._id,
        whatsappNumber: normalizedWhatsapp,
        state: state || 'Lagos',
        city: city || '',
        lga: lga || '',
        area: area || 'General',
        additionalAreas: Array.isArray(additionalAreas) ? additionalAreas : [],
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
        phone: normalizedPhone,
        whatsapp: normalizedWhatsapp,
        state: state || 'Lagos',
        city: city || '',
        lga: lga || '',
        area: area || '',
        businessAddress: businessAddress || '',
        website: website || '',
        socialLinks: socialLinks || {},
        verificationStatus: 'verified',
      });
    }

    // In-app welcome notification
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
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify user email via token
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token, email } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const cleanToken = token ? String(token).trim() : null;
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

    let user = null;
    if (cleanToken) {
      const verificationToken = await VerificationToken.findOne({
        token: cleanToken,
        type: 'email_verify',
      });
      if (verificationToken) {
        user = await User.findById(verificationToken.userId);
        await VerificationToken.deleteMany({ userId: verificationToken.userId, type: 'email_verify' });
      }
    }

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    }

    if (user) {
      if (!user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
      const jwtToken = generateToken(user._id, user.role);
      return res.status(200).json({
        success: true,
        message: 'Email verification is no longer required on MEDIOVA. Your account is active.',
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email verification is no longer required on MEDIOVA. You can log in directly.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification email (Stubbed for compatibility)
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await User.findOne({ email: normalizedEmail });
      if (user && !user.emailVerified) {
        user.emailVerified = true;
        await user.save();
      }
    }
    res.status(200).json({
      success: true,
      message: 'Email verification is no longer required on MEDIOVA. You can log in directly with your email and password.',
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

    // Ensure previously unverified accounts are automatically marked verified and never blocked
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const token = generateToken(user._id, user.role);

    // Fetch related profile if applicable
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
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
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
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        emailVerified: user.emailVerified,
        accountStatus: user.accountStatus,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - initiates secure single-use token recovery
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your account email address.',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Always proceed with a generic response to prevent account enumeration
    if (user) {
      // Invalidate any existing reset tokens
      await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

      // Generate cryptographically secure 32-byte hex token
      const rawToken = crypto.randomBytes(32).toString('hex');

      await VerificationToken.create({
        userId: user._id,
        token: rawToken,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      });

      const clientUrl = getClientUrl();
      const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;
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
    }

    res.status(200).json({
      success: true,
      message:
        'If an account with that email address exists in our system, you will receive password reset instructions shortly.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password with token & complexity verification
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

    // Backend password complexity enforcement
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      });
    }

    const resetToken = await VerificationToken.findOne({
      token: String(token).trim(),
      type: 'password_reset',
      expiresAt: { $gt: Date.now() },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new one.',
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    user.password = password;
    await user.save();

    // Single-use token invalidation
    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new credentials.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Register Admin (Protected by ADMIN_INVITE_SECRET)
 * @route   POST /api/auth/admin-register
 * @access  Restricted
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { name, email, password, inviteSecret } = req.body;

    const configuredSecret = process.env.ADMIN_INVITE_SECRET || 'DOPTV_ADMIN_ACCESS_2026';

    if (!inviteSecret || inviteSecret !== configuredSecret) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Invalid Admin Registration Secret.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      emailVerified: true,
      accountStatus: 'active',
    });

    const token = generateToken(admin._id, admin.role);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully.',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  registerAdmin,
};
