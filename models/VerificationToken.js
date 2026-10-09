const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email_verify', 'password_reset'],
      default: 'email_verify',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '0s' }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
