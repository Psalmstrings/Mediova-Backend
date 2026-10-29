const Campaign = require('../models/Campaign');
const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const Gig = require('../models/Gig');
const Notification = require('../models/Notification');
const Category = require('../models/Category');
const ReachPackage = require('../models/ReachPackage');
const AdminSettings = require('../models/AdminSettings');
const RefundRequest = require('../models/RefundRequest');
const Payment = require('../models/Payment');
const TermsAcceptance = require('../models/TermsAcceptance');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const { processUploadedFile } = require('../middleware/upload');
const { normalizePhoneNumber, isValidPhoneNumber, getCountryMeta } = require('../utils/locations');

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AD-${timestamp}${random}`;
};

/**
 * @desc    Get vendor profile
 * @route   GET /api/vendors/profile
 * @access  Private (Vendor)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }
    const user = await User.findById(req.user._id).select('name email phone whatsappNumber country countryCode location');
    res.status(200).json({ success: true, profile, user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update vendor profile
 * @route   PUT /api/vendors/profile
 * @access  Private (Vendor)
 */
const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      businessName,
      contactPerson,
      businessCategory,
      description,
      whatsappNumber,
      phone,
      country,
      region,
      subDivision,
      area,
      state,
      lga,
      businessAddress,
      website,
      socialLinks,
    } = req.body;

    const rawPhone = whatsappNumber || phone;
    let normalizedWhatsapp = null;
    if (rawPhone) {
      normalizedWhatsapp = normalizePhoneNumber(rawPhone);
      if (!isValidPhoneNumber(normalizedWhatsapp)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid WhatsApp phone number in international format.',
        });
      }
    }

    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    if (normalizedWhatsapp) {
      userUpdates.whatsappNumber = normalizedWhatsapp;
      userUpdates.phone = normalizedWhatsapp;
    }
    if (country) userUpdates.country = country;
    if (region || subDivision || area) {
      userUpdates.location = {
        region: region || state || '',
        subDivision: subDivision || lga || '',
        area: area || '',
      };
    }

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, userUpdates);
    }

    const resolvedRegion = region || state;
    const resolvedSub = subDivision || lga;

    const profile = await VendorProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(businessName && { businessName }),
        ...(contactPerson && { contactPerson }),
        ...(businessCategory && { businessCategory }),
        ...(description !== undefined && { description }),
        ...(normalizedWhatsapp && { phone: normalizedWhatsapp, whatsapp: normalizedWhatsapp }),
        ...(resolvedRegion && { state: resolvedRegion }),
        ...(resolvedSub !== undefined && { city: resolvedSub, lga: resolvedSub }),
        ...(area !== undefined && { area }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(website !== undefined && { website }),
        ...(socialLinks && { socialLinks }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create advertising campaign
 * @route   POST /api/vendors/campaigns
 * @access  Private (Vendor)
 */
const createCampaign = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      objective,
      adCopy,
      callToAction,
      targetCountry = 'Nigeria',
      targetRegion = '',
      targetAreas,
      isNationwide,
      targetLocation,
      targetRadius,
      reachPackageId,
      requiredViews,
      price,
      currency = 'NGN',
      duration,
      instructions,
    } = req.body;

    if (!title || !description || !category || !objective) {
      return res.status(400).json({
        success: false,
        message: 'Campaign title, description, category, and objective are all required.',
      });
    }

    // Load admin configured maximum areas limit
    const settings = await AdminSettings.findOne();
    const maxCampaignAreas = settings?.maxCampaignAreas || 15;

    // Parse target areas array
    let parsedAreas = [];
    if (typeof targetAreas === 'string') {
      try {
        parsedAreas = JSON.parse(targetAreas);
      } catch {
        parsedAreas = targetAreas.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(targetAreas)) {
      parsedAreas = targetAreas;
    }

    const nationwideFlag = isNationwide === true || isNationwide === 'true';

    // Backend enforcement of administrator-configured maximum local areas
    if (!nationwideFlag && parsedAreas.length > maxCampaignAreas) {
      return res.status(400).json({
        success: false,
        message: `Maximum allowed targeting areas is ${maxCampaignAreas}. You selected ${parsedAreas.length} areas.`,
      });
    }

    // Call to Action
    let parsedCta = { actionType: 'WhatsApp', targetValue: '' };
    if (typeof callToAction === 'string') {
      try {
        parsedCta = JSON.parse(callToAction);
      } catch {
        parsedCta = { actionType: 'WhatsApp', targetValue: callToAction };
      }
    } else if (callToAction && typeof callToAction === 'object') {
      parsedCta = {
        actionType: callToAction.actionType || 'WhatsApp',
        targetValue: callToAction.targetValue || '',
      };
    }

    if (!requiredViews || Number(requiredViews) < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum required reach is 1,000 views.',
      });
    }

    // Handle media uploads: supports multiple advert images and payment receipt
    const rawMediaFiles = [];
    if (req.files) {
      if (req.files.media) {
        if (Array.isArray(req.files.media)) rawMediaFiles.push(...req.files.media);
        else rawMediaFiles.push(req.files.media);
      }
      if (req.files.mediaFiles) {
        if (Array.isArray(req.files.mediaFiles)) rawMediaFiles.push(...req.files.mediaFiles);
        else rawMediaFiles.push(req.files.mediaFiles);
      }
    }
    if (req.file) rawMediaFiles.push(req.file);

    const mediaList = [];
    for (const file of rawMediaFiles) {
      const uploadedMedia = await processUploadedFile(file, 'campaign_media');
      if (uploadedMedia) {
        mediaList.push({
          url: uploadedMedia.url,
          publicId: uploadedMedia.publicId,
          type: uploadedMedia.resourceType === 'video' ? 'video' : 'image',
        });
      }
    }
    const primaryMedia = mediaList[0] || { url: '', publicId: '', type: 'image' };

    let receiptData = null;
    if (req.files) {
      const receiptFile = req.files.receipt
        ? req.files.receipt[0]
        : req.files.receiptFile
        ? req.files.receiptFile[0]
        : null;

      if (receiptFile) {
        const uploadedReceipt = await processUploadedFile(receiptFile, 'payment_receipts');
        if (uploadedReceipt) {
          receiptData = {
            url: uploadedReceipt.url,
            publicId: uploadedReceipt.publicId,
            uploadedAt: new Date(),
          };
        }
      }
    }

    let reachPackageName = '';
    if (reachPackageId) {
      const pkg = await ReachPackage.findById(reachPackageId);
      if (pkg) reachPackageName = pkg.name;
    }

    const orderNumber = generateOrderNumber();
    const resolvedCountryMeta = getCountryMeta(targetCountry);

    const initialStatus = receiptData ? 'Payment Submitted' : 'Awaiting Payment';
    const initialPaymentStatus = receiptData ? 'submitted' : 'unpaid';

    const campaign = await Campaign.create({
      orderNumber,
      vendorId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      objective: objective.trim(),
      media: primaryMedia,
      mediaList: mediaList,
      adCopy: adCopy || '',
      callToAction: parsedCta,
      targetCountry: resolvedCountryMeta.name,
      targetCountryCode: resolvedCountryMeta.code,
      targetRegion: targetRegion || 'General',
      targetAreas: parsedAreas,
      isNationwide: nationwideFlag,
      targetLocation: {
        state: nationwideFlag ? 'Nationwide' : targetRegion || 'General',
        targetStates: nationwideFlag ? ['Nationwide'] : [targetRegion || 'General'],
        isNationwide: nationwideFlag,
        city: parsedAreas[0] || '',
        lga: parsedAreas[0] || '',
        area: parsedAreas.join(', ') || 'General',
      },
      targetRadius: targetRadius || '',
      reachPackageId: reachPackageId || null,
      reachPackageName,
      requiredViews: Number(requiredViews),
      price: Number(price) || 0,
      currency: currency || settings?.bankDetails?.currency || 'NGN',
      duration: duration || '24 Hours',
      instructions: instructions || '',
      paymentReceipt: receiptData || undefined,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
    });

    // If receipt was attached at creation, create persistent Payment record
    if (receiptData) {
      await Payment.create({
        vendorId: req.user._id,
        campaignId: campaign._id,
        amount: campaign.price,
        currency: campaign.currency,
        receiptUrl: receiptData.url,
        receiptPublicId: receiptData.publicId,
        status: 'submitted',
      });
    }

    // Record Schedule A Vendor Declaration
    try {
      await TermsAcceptance.create({
        userId: req.user._id,
        role: req.user.role || 'vendor',
        documentIdentifier: 'mediova_terms_and_conditions_of_service',
        declarationType: 'vendor_schedule_a',
        source: 'vendor_campaign_declaration',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers ? req.headers['user-agent'] : undefined,
        metadata: {
          campaignId: campaign._id,
          orderNumber: campaign.orderNumber,
          campaignTitle: campaign.title,
        },
      });
    } catch (declErr) {
      console.warn('Vendor Schedule A Declaration audit logging failed:', declErr.message);
    }

    // Notification for vendor
    await Notification.create({
      userId: req.user._id,
      title: 'Campaign Order Created',
      message: `Your advertising campaign #${orderNumber} for "${title}" has been created successfully.`,
      type: 'info',
      link: `/vendor/orders/${campaign._id}`,
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Campaign Order Submitted',
        message: `Order #${orderNumber} submitted by ${req.user.name}. Status: ${initialStatus}.`,
        type: 'campaign',
        link: `/admin/campaigns/${campaign._id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Campaign order submitted successfully!',
      campaign,
      orderNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload payment receipt image for a campaign
 * @route   POST /api/vendors/campaigns/:id/receipt
 * @access  Private (Vendor)
 */
const submitPaymentReceipt = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files.receipt && req.files.receipt[0]);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Please select an image file of your payment receipt/transfer confirmation.',
      });
    }

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      vendorId: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const uploaded = await processUploadedFile(file, 'payment_receipts');
    if (!uploaded || !uploaded.url) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload receipt image. Please try again.',
      });
    }

    campaign.paymentReceipt = {
      url: uploaded.url,
      publicId: uploaded.publicId,
      uploadedAt: new Date(),
    };
    campaign.paymentStatus = 'submitted';
    campaign.status = 'Payment Submitted';
    await campaign.save();

    // Create or update payment record
    let payment = await Payment.findOne({ campaignId: campaign._id });
    if (payment) {
      payment.receiptUrl = uploaded.url;
      payment.receiptPublicId = uploaded.publicId;
      payment.status = 'submitted';
      payment.submittedAt = new Date();
      await payment.save();
    } else {
      payment = await Payment.create({
        vendorId: req.user._id,
        campaignId: campaign._id,
        amount: campaign.price,
        currency: campaign.currency,
        receiptUrl: uploaded.url,
        receiptPublicId: uploaded.publicId,
        status: 'submitted',
      });
    }

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'Payment Receipt Uploaded',
        message: `Vendor uploaded payment receipt for Order #${campaign.orderNumber} (${campaign.currency} ${Number(campaign.price).toLocaleString()}).`,
        type: 'payment',
        link: `/admin/campaigns/${campaign._id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment receipt uploaded successfully! Admin will verify payment shortly.',
      campaign,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor review of completed work (Accept or Raise Issue)
 * @route   PUT /api/vendors/campaigns/:id/review-work
 * @access  Private (Vendor)
 */
const reviewCompletedWork = async (req, res, next) => {
  try {
    const { action, comments = '' } = req.body;

    if (!['accept', 'raise_issue'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'accept' or 'raise_issue'.",
      });
    }

    const campaign = await Campaign.findOne({
      _id: req.params.id,
      vendorId: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (action === 'accept') {
      campaign.status = 'Completed';
      campaign.completedWork.vendorReviewStatus = 'accepted';
      campaign.completedWork.vendorReviewComment = comments;
      campaign.completedWork.vendorReviewedAt = new Date();
      campaign.completedWork.history.push({
        action: 'vendor_accepted',
        notes: comments || 'Vendor accepted completed work without objections.',
        timestamp: new Date(),
        by: req.user._id,
      });
    } else {
      if (!comments.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Please provide detailed notes explaining the issue or revision needed.',
        });
      }
      campaign.status = 'Issue Raised';
      campaign.completedWork.vendorReviewStatus = 'issue_raised';
      campaign.completedWork.vendorReviewComment = comments;
      campaign.completedWork.vendorReviewedAt = new Date();
      campaign.completedWork.history.push({
        action: 'vendor_issue_raised',
        notes: comments,
        timestamp: new Date(),
        by: req.user._id,
      });
    }

    await campaign.save();

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: action === 'accept' ? 'Completed Work Accepted' : 'Vendor Raised Issue on Completed Work',
        message: `Order #${campaign.orderNumber}: ${action === 'accept' ? 'Vendor approved completed work.' : `Vendor raised issue: "${comments.slice(0, 80)}..."`}`,
        type: action === 'accept' ? 'campaign' : 'warning',
        link: `/admin/campaigns/${campaign._id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: action === 'accept' ? 'Work accepted successfully! Thank you for using MEDIOVA.' : 'Issue recorded. Admin will review and address your notes.',
      campaign,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all campaigns for logged in vendor
 * @route   GET /api/vendors/campaigns
 * @access  Private (Vendor)
 */
const getMyCampaigns = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { vendorId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: campaigns.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      campaigns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific campaign details for vendor
 * @route   GET /api/vendors/campaigns/:id
 * @access  Private (Vendor)
 */
const getCampaignDetails = async (req, res, next) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      vendorId: req.user._id,
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const gigs = await Gig.find({ campaignId: campaign._id })
      .select('gigNumber assignedViews reward status')
      .populate('influencerId', 'name');

    const payment = await Payment.findOne({ campaignId: campaign._id });

    res.status(200).json({
      success: true,
      campaign,
      gigs,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get campaign order options (categories, reach packages, payment info, settings)
 * @route   GET /api/vendors/order-options
 * @access  Private (Vendor)
 */
const getOrderOptions = async (req, res, next) => {
  try {
    // 1. Fetch active advertising categories created by Admin (type: 'ad' or unconstrained)
    let categories = await Category.find({
      status: { $ne: 'inactive' },
      $or: [
        { type: 'ad' },
        { type: { $exists: false } },
        { type: null }
      ]
    }).sort({ displayOrder: 1, name: 1 });

    // Fallback: If no 'ad' specific categories exist, return all active categories
    if (!categories || categories.length === 0) {
      categories = await Category.find({ status: { $ne: 'inactive' } }).sort({ displayOrder: 1, name: 1 });
    }

    // 2. Fetch active campaign objectives created by Admin (type: 'objective')
    const objectives = await Category.find({
      type: 'objective',
      status: { $ne: 'inactive' }
    }).sort({ displayOrder: 1, name: 1 });

    // 3. Fetch active reach packages created by Admin
    const packages = await ReachPackage.find({
      status: { $ne: 'inactive' }
    }).sort({ displayOrder: 1, minimumViews: 1, price: 1 });

    const settings = await AdminSettings.findOne();

    res.status(200).json({
      success: true,
      categories,
      objectives,
      packages,
      durations: settings?.availableDurations || ['24 Hours (1 Day)', '48 Hours (2 Days)', '3 Days', '7 Days', 'Custom Duration'],
      paymentSettings: {
        bankName: settings?.bankDetails?.bankName || 'Zenith Bank',
        accountName: settings?.bankDetails?.accountName || 'MEDIOVA Media Brokerage Ltd',
        accountNumber: settings?.bankDetails?.accountNumber || '1012345678',
        currency: settings?.bankDetails?.currency || 'NGN',
        sortCode: settings?.bankDetails?.sortCode || '',
        swiftBic: settings?.bankDetails?.swiftBic || '',
        instructions: settings?.manualPaymentInstructions || 'Please make a direct transfer to our brokerage account below and upload your payment receipt directly on this page for admin verification.',
        whatsappNumber: settings?.whatsappNumber || '+2348012345678',
      },
      maxCampaignAreas: settings?.maxCampaignAreas || 15,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit refund request
 * @route   POST /api/vendors/refunds
 * @access  Private (Vendor)
 */
const submitRefundRequest = async (req, res, next) => {
  try {
    const { campaignId, reason, bankDetails, amount } = req.body;

    if (!campaignId || !reason || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, detailed reason, and payout bank details are required.',
      });
    }

    const campaign = await Campaign.findOne({ _id: campaignId, vendorId: req.user._id });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const refundNumber = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const refund = await RefundRequest.create({
      refundNumber,
      campaignId,
      vendorId: req.user._id,
      amount: Number(amount) || campaign.price,
      reason,
      bankDetails,
      status: 'pending',
    });

    await Notification.create({
      userId: req.user._id,
      title: 'Refund Request Received',
      message: `Your refund request #${refundNumber} for order #${campaign.orderNumber} has been received and is under administrative review.`,
      type: 'info',
      link: `/vendor/orders/${campaign._id}`,
    });

    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Refund Request Submitted',
        message: `Refund #${refundNumber} submitted by ${req.user.name} for campaign "${campaign.title}".`,
        type: 'payment',
        link: `/admin/refunds`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully.',
      refund,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all refund requests for logged-in vendor
 * @route   GET /api/vendors/refunds
 * @access  Private (Vendor)
 */
const getMyRefundRequests = async (req, res, next) => {
  try {
    const refunds = await RefundRequest.find({ vendorId: req.user._id })
      .populate('campaignId', 'title orderNumber price status paymentStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: refunds.length,
      refunds,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  createCampaign,
  submitPaymentReceipt,
  reviewCompletedWork,
  getMyCampaigns,
  getCampaignDetails,
  getOrderOptions,
  submitRefundRequest,
  getMyRefundRequests,
};
