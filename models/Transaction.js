const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    influencerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['gig_reward', 'bonus', 'payout'],
      default: 'gig_reward',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending',
    },
    paymentReference: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
