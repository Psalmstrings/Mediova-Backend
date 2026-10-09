const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: 'MEDIOVA Advertising',
    },
    platformTagline: {
      type: String,
      default: 'Turn WhatsApp Status views into income. Reach real people through trusted WhatsApp audiences.',
    },
    logo: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: 'support@mediova.ng',
    },
    supportPhone: {
      type: String,
      default: '+2348012345678',
    },
    whatsappNumber: {
      type: String,
      default: '+2348012345678',
    },
    businessAddress: {
      type: String,
      default: 'Victoria Island, Lagos, Nigeria',
    },
    defaultWhatsAppMessage: {
      type: String,
      default: 'Hello MEDIOVA Team, I have submitted advertising order #{ORDER_NUMBER} for "{TITLE}" and would like to complete payment.',
    },
    manualPaymentInstructions: {
      type: String,
      default: 'Please make a direct bank transfer to our official brokerage account and send receipt confirmation to our Admin WhatsApp line.',
    },
    bankDetails: {
      bankName: { type: String, default: 'Zenith Bank Nigeria' },
      accountName: { type: String, default: 'MEDIOVA Media Brokerage Ltd' },
      accountNumber: { type: String, default: '1012345678' },
    },
    minInfluencerViews: {
      type: Number,
      default: 500,
    },
    availableDurations: {
      type: [String],
      default: ['24 Hours (1 Day)', '48 Hours (2 Days)', '3 Days', '7 Days', 'Custom Duration'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminSettings', adminSettingsSchema);
