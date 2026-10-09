const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business/Company name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    businessCategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    lga: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    businessAddress: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    socialLinks: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified'],
      default: 'verified',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
