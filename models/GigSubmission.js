const mongoose = require('mongoose');

const gigSubmissionSchema = new mongoose.Schema(
  {
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true,
      unique: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoUrl: {
      type: String,
      default: '',
    },
    videoPublicId: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['video', 'image'],
      default: 'video',
    },
    proofImages: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        caption: { type: String, default: '' },
        type: { type: String, enum: ['status_post', 'status_views', 'additional', 'video'], default: 'status_post' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    reportedViews: {
      type: Number,
      required: [true, 'Reported WhatsApp views are required'],
      min: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewComment: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GigSubmission', gigSubmissionSchema);
