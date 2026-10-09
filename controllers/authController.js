const crypto = require('crypto');
const User = require('../models/User');
const InfluencerProfile = require('../models/InfluencerProfile');
const VendorProfile = require('../models/VendorProfile');
const VerificationToken = require('../models/VerificationToken');
const Notification = require('../models/Notification');
const generateToken = require('../utils/generateToken');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');

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

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    // Create base user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      password,
      role,
      emailVerified: false,
      accountStatus: 'active',
    });

    // Create role-specific profile
    if (role === 'influencer') {
      await InfluencerProfile.create({
        userId: user._id,
        whatsappNumber: whatsappNumber || phone || '',
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
      await VendorProfile.create({
        userId: user._id,
        businessName: businessName || name,
        contactPerson: contactPerson || name,
        businessCategory: businessCategory || 'General Advertising',
        description: description || '',
        phone: phone || '',
        whatsapp: whatsappNumber || phone || '',
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

    // Generate secure email verification token
    const tokenString = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({
      userId: user._id,
      token: tokenString,
      type: 'email_verify',
      expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify-email?token=${tokenString}&email=${encodeURIComponent(user.email)}`;

    // Send verification email
    const emailData = emailTemplates.verifyEmail({
      name: user.name,
      verificationUrl,
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (emailResult && emailResult.error) {
      // Roll back user creation to prevent orphaned unverified accounts
      await User.findByIdAndDelete(user._id);
      if (role === 'influencer') {
        await InfluencerProfile.findOneAndDelete({ userId: user._id });
      } else if (role === 'vendor') {
        await VendorProfile.findOneAndDelete({ userId: user._id });
      }
      await VerificationToken.deleteMany({ userId: user._id });

      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please verify your email address and try again later.',
      });
    }

    // In-app welcome notification
    await Notification.create({
      userId: user._id,
      title: 'Welcome to MEDIOVA!',
      message: 'Please check your email to verify your account and start accepting or placing ads.',
      type: 'info',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! We sent a verification link to your email.',
      verificationUrl, // included for easy dev workflow / local testing
      userId: user._id,
      email: user.email,
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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    const verificationToken = await VerificationToken.findOne({
      token,
      type: 'email_verify',
      expiresAt: { $gt: Date.now() },
    });

    if (!verificationToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });
    }

    const user = await User.findById(verificationToken.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    user.emailVerified = true;
    await user.save();

    // Delete token
    await VerificationToken.findByIdAndDelete(verificationToken._id);

    // Send welcome email
    const welcomeData = emailTemplates.welcome({
      name: user.name,
      role: user.role,
    });
    await sendEmail({
      to: user.email,
      subject: welcomeData.subject,
      html: welcomeData.html,
      text: welcomeData.text,
    });

    const jwtToken = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Your email has been verified successfully.',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ success: false, message: 'This email is already verified. You can log in.' });
    }

    // Invalidate existing tokens
    await VerificationToken.deleteMany({ userId: user._id, type: 'email_verify' });

    const tokenString = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await VerificationToken.create({
      userId: user._id,
      token: tokenString,
      type: 'email_verify',
      expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationUrl = `${clientUrl}/verify-email?token=${tokenString}&email=${encodeURIComponent(user.email)}`;

    const emailData = emailTemplates.verifyEmail({
      name: user.name,
      verificationUrl,
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (emailResult && emailResult.error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'A new verification email has been sent. Please check your inbox.',
      verificationUrl,
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

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
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

    if (!user.emailVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        requiresVerification: true,
        email: user.email,
        message: 'Please verify your email address before logging in.',
      });
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
 * @desc    Forgot Password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email ? email.toLowerCase() : '' });

    if (!user) {
      // Return success to avoid email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.',
      });
    }

    await VerificationToken.deleteMany({ userId: user._id, type: 'password_reset' });

    const tokenString = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await VerificationToken.create({
      userId: user._id,
      token: tokenString,
      type: 'password_reset',
      expiresAt,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${tokenString}`;

    const emailData = emailTemplates.passwordReset({
      name: user.name,
      resetUrl,
    });

    const emailResult = await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (emailResult && emailResult.error) {
      await VerificationToken.deleteMany({ userId: user._id, token: tokenString });
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email. Please try again later.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.',
      ...(process.env.NODE_ENV === 'development' ? { resetUrl } : {}),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    const resetToken = await VerificationToken.findOne({
      token,
      type: 'password_reset',
      expiresAt: { $gt: Date.now() },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link.',
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = password;
    await user.save();

    await VerificationToken.findByIdAndDelete(resetToken._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now log in.',
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
