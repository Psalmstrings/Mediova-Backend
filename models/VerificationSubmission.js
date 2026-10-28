const mongoose = require('mongoose');

const verificationSubmissionSchema = new mongoose.Schema(
  {
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    videoUrl: {
      type: String,
      required: [true, 'Verification video URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      default: 'video',
    },
    fileFormat: {
      type: String,
      default: 'mp4',
    },
    status: {
      type: String,
      enum: ['pending', 'under_review', 'verified', 'rejected'],
      default: 'under_review',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    adminDecision: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    verifiedViews: {
      type: Number,
      default: 0,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    history: [
      {
        action: { type: String, default: 'submission' },
        status: { type: String, default: 'under_review' },
        notes: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VerificationSubmission', verificationSubmissionSchema);
