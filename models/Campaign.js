const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Campaign/Advertisement name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Campaign description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    objective: {
      type: String,
      required: [true, 'Campaign objective is required'],
      trim: true,
    },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      type: { type: String, enum: ['image', 'video', 'flyer'], default: 'image' },
    },
    adCopy: {
      type: String,
      default: '',
      trim: true,
    },
    callToAction: {
      actionType: {
        type: String,
        enum: ['WhatsApp', 'Call', 'Website', 'Visit Store', 'Buy Now', 'Learn More', 'Send Message', 'Other'],
        default: 'WhatsApp',
      },
      targetValue: {
        type: String,
        default: '',
        trim: true,
      },
    },
    targetLocation: {
      state: { type: String, required: true },
      city: { type: String, default: '' },
      lga: { type: String, default: '' },
      area: { type: String, required: true },
      businessAddress: { type: String, default: '' },
    },
    targetRadius: {
      type: String,
      default: '',
    },
    reachPackageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReachPackage',
    },
    reachPackageName: {
      type: String,
      default: '',
    },
    requiredViews: {
      type: Number,
      required: [true, 'Required reach (views) is required'],
      min: [1000, 'Minimum reach starts at 1,000 views'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      default: '24 Hours',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    instructions: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'Awaiting Payment',
        'Payment Confirmed',
        'Under Review',
        'Approved',
        'Processing',
        'Influencers Assigned',
        'Active',
        'Awaiting Proof',
        'Completed',
        'Rejected',
        'Cancelled',
      ],
      default: 'Awaiting Payment',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'confirmed', 'refunded'],
      default: 'unpaid',
    },
    assignedReach: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
