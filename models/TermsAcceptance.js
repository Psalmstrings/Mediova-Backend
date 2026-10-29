const mongoose = require('mongoose');

const termsAcceptanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['vendor', 'influencer', 'admin'],
      required: true,
    },
    documentIdentifier: {
      type: String,
      default: 'terms_and_conditions',
      trim: true,
    },
    declarationType: {
      type: String,
      enum: ['general', 'vendor_schedule_a', 'influencer_schedule_b'],
      default: 'general',
    },
    source: {
      type: String,
      enum: [
        'registration',
        'login',
        'renewed_acceptance',
        'vendor_campaign_declaration',
        'influencer_gig_declaration',
      ],
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TermsAcceptance', termsAcceptanceSchema);
