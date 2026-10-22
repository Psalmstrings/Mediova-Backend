const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema(
  {
    refundNumber: {
      type: String,
      unique: true,
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      enum: [
        'Campaign Cancelled Before Launch',
        'Reach SLA Not Met',
        'Influencer Non-Delivery',
        'Duplicate Payment',
        'Billing Error',
        'Other',
      ],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    bankDetails: {
      accountName: { type: String, required: true, trim: true },
      bankName: { type: String, required: true, trim: true },
      accountNumber: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: ['Requested', 'Under Review', 'Approved', 'Rejected', 'Processing', 'Refunded'],
      default: 'Requested',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    transferReference: {
      type: String,
      default: '',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
