const mongoose = require('mongoose');

const influencerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    whatsappNumber: {
      type: String,
      required: [true, 'WhatsApp number is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
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
      required: [true, 'Area/Neighborhood is required'],
      trim: true,
    },
    additionalAreas: {
      type: [String],
      default: [],
    },
    averageViews: {
      type: Number,
      default: 0,
    },
    verifiedViews: {
      type: Number,
      default: 0,
    },
    categories: {
      type: [String],
      default: [],
    },
    availability: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    reliabilityScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    completedGigs: {
      type: Number,
      default: 0,
    },
    successfulGigs: {
      type: Number,
      default: 0,
    },
    bankDetails: {
      accountName: { type: String, default: '', trim: true },
      bankName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
    },
    payoutStatus: {
      type: String,
      enum: [
        'not_configured',
        'pending_verification',
        'verified',
        'eligible_for_payout',
        'processing',
        'paid',
        'failed',
        'on_hold',
      ],
      default: 'not_configured',
    },
    payoutMethod: {
      type: String,
      default: 'bank_transfer',
    },
    payoutAuditLog: [
      {
        action: { type: String, default: 'update' },
        timestamp: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
    proofImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('InfluencerProfile', influencerProfileSchema);
