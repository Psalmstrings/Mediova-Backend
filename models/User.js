const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      default: 'Nigeria',
      trim: true,
    },
    countryCode: {
      type: String,
      default: 'NG',
      trim: true,
    },
    location: {
      region: { type: String, default: '', trim: true },
      subDivision: { type: String, default: '', trim: true },
      area: { type: String, default: '', trim: true },
    },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      validate: {
        validator: function (val) {
          // If Google user or not provided (when optional)
          if (!val && this.authProvider === 'google') return true;
          // If already hashed (bcrypt hash length is 60), pass validation
          if (val && val.length === 60 && val.startsWith('$2')) return true;
          return (
            val &&
            val.length >= 8 &&
            /[A-Z]/.test(val) &&
            /[a-z]/.test(val) &&
            /[0-9]/.test(val) &&
            /[!@#$%^&*(),.?":{}|<>]/.test(val)
          );
        },
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      },
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: {
      type: String,
      default: '',
      select: false,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedVersion: {
      type: String,
      default: '2.0',
    },
    termsAcceptedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['influencer', 'vendor', 'admin'],
      default: 'influencer',
      required: [true, 'User role is required'],
    },
    emailVerified: {
      type: Boolean,
      default: true,
    },
    accountStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active',
    },
    influencerVerificationStatus: {
      type: String,
      enum: ['none', 'pending', 'under_review', 'verified', 'rejected'],
      default: 'none',
    },
    profileImage: {
      type: String,
      default: '',
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
