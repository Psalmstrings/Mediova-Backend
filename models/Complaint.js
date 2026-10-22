const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRole: {
      type: String,
      enum: ['vendor', 'influencer'],
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Complaint category is required'],
      enum: [
        'Advertising Request Failure',
        'Campaign Delivery / Reach Dispute',
        'Influencer Gig Completion',
        'Delayed / Failed Payout',
        'Refund Dispute',
        'Account Verification / Access',
        'Misconduct / Campaign Misuse',
        'Privacy Concern',
        'Other',
      ],
    },
    referenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true,
    },
    preferredContact: {
      type: String,
      enum: ['email', 'whatsapp', 'phone'],
      default: 'email',
    },
    status: {
      type: String,
      enum: ['Open', 'Under Review', 'Awaiting Information', 'Resolved', 'Closed'],
      default: 'Open',
    },
    internalInvestigationNotes: {
      type: String,
      default: '',
    },
    resolutionSummary: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Complaint', complaintSchema);
