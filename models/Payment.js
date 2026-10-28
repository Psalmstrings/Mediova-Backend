const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    receiptPublicId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['awaiting_payment', 'submitted', 'under_review', 'confirmed', 'rejected', 'refunded'],
      default: 'submitted',
      index: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
