const mongoose = require('mongoose');

const adminSettingsSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: 'MEDIOVA Advertising',
    },
    platformTagline: {
      type: String,
      default: 'Connect global brands with trusted WhatsApp Status creators worldwide.',
    },
    logo: {
      type: String,
      default: '',
    },
    supportEmail: {
      type: String,
      default: 'support@mediova.com',
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
      default: 'Global Operations Headquarters & Regional Hubs',
    },
    defaultWhatsAppMessage: {
      type: String,
      default: 'Hello MEDIOVA Team, I have submitted advertising order #{ORDER_NUMBER} for "{TITLE}" and would like to confirm my payment.',
    },
    manualPaymentInstructions: {
      type: String,
      default: 'Please make a direct transfer to our official brokerage account below and upload your payment receipt directly on this page for admin verification.',
    },
    bankDetails: {
      bankName: { type: String, default: 'Zenith Bank' },
      accountName: { type: String, default: 'MEDIOVA Media Brokerage Ltd' },
      accountNumber: { type: String, default: '1012345678' },
      currency: { type: String, default: 'NGN' },
      sortCode: { type: String, default: '' },
      swiftBic: { type: String, default: '' },
    },
    maxCampaignAreas: {
      type: Number,
      default: 15,
      min: 1,
      max: 100,
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
