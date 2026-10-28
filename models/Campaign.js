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
    mediaList: [
      {
        url: { type: String, default: '' },
        publicId: { type: String, default: '' },
        type: { type: String, enum: ['image', 'video', 'flyer'], default: 'image' },
      },
    ],
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
    targetCountry: {
      type: String,
      default: 'Nigeria',
      trim: true,
    },
    targetCountryCode: {
      type: String,
      default: 'NG',
      trim: true,
    },
    targetRegion: {
      type: String,
      default: 'Lagos',
      trim: true,
    },
    targetAreas: {
      type: [String],
      default: [],
    },
    targetLocation: {
      state: { type: String, default: '' },
      targetStates: { type: [String], default: [] },
      isNationwide: { type: Boolean, default: false },
      city: { type: String, default: '' },
      lga: { type: String, default: '' },
      area: { type: String, default: 'General' },
      businessAddress: { type: String, default: '' },
    },
    targetStates: { type: [String], default: [] },
    isNationwide: { type: Boolean, default: false },
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
    currency: {
      type: String,
      default: 'NGN',
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
    paymentReceipt: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      uploadedAt: { type: Date },
    },
    status: {
      type: String,
      enum: [
        'Draft',
        'Submitted',
        'Awaiting Payment',
        'Payment Submitted',
        'Payment Confirmed',
        'Under Review',
        'Approved',
        'Processing',
        'Influencers Assigned',
        'Active',
        'Awaiting Proof',
        'Submitted for Vendor Review',
        'Completed',
        'Issue Raised',
        'Rejected',
        'Cancelled',
      ],
      default: 'Submitted',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'submitted', 'confirmed', 'rejected', 'refunded'],
      default: 'unpaid',
    },
    paymentReview: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: { type: Date },
      decision: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
    },
    completedWork: {
      summary: { type: String, default: '' },
      notes: { type: String, default: '' },
      evidenceUrls: [
        {
          url: { type: String, default: '' },
          caption: { type: String, default: '' },
          publicId: { type: String, default: '' },
          mediaType: { type: String, default: 'video' },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      submittedAt: { type: Date },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      vendorReviewStatus: {
        type: String,
        enum: ['none', 'submitted', 'accepted', 'issue_raised'],
        default: 'none',
      },
      vendorReviewComment: { type: String, default: '' },
      vendorReviewedAt: { type: Date },
      history: [
        {
          action: { type: String, default: 'admin_submitted' },
          notes: { type: String, default: '' },
          timestamp: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
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
