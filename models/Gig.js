const mongoose = require('mongoose');

const gigSchema = new mongoose.Schema(
  {
    gigNumber: {
      type: String,
      unique: true,
      required: true,
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
    assignedViews: {
      type: Number,
      required: true,
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'assigned',
        'accepted',
        'declined',
        'in_progress',
        'submitted',
        'approved',
        'rejected',
      ],
      default: 'assigned',
    },
    declineReason: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Gig', gigSchema);
