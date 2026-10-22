const Campaign = require('../models/Campaign');
const VendorProfile = require('../models/VendorProfile');
const User = require('../models/User');
const Gig = require('../models/Gig');
const Notification = require('../models/Notification');
const Category = require('../models/Category');
const ReachPackage = require('../models/ReachPackage');
const AdminSettings = require('../models/AdminSettings');
const RefundRequest = require('../models/RefundRequest');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const { processUploadedFile } = require('../middleware/upload');

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
    res.status(200).json({ success: true, profile });
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
      phone,
      whatsapp,
      state,
      city,
      lga,
      area,
      businessAddress,
      website,
      socialLinks,
    } = req.body;

    if (name) {
      await User.findByIdAndUpdate(req.user._id, { name });
    }

    const profile = await VendorProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(businessName && { businessName }),
        ...(contactPerson && { contactPerson }),
        ...(businessCategory && { businessCategory }),
        ...(description !== undefined && { description }),
        ...(phone && { phone }),
        ...(whatsapp && { whatsapp }),
        ...(state && { state }),
        ...(city !== undefined && { city }),
        ...(lga !== undefined && { lga }),
        ...(area !== undefined && { area }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(website !== undefined && { website }),
        ...(socialLinks && { socialLinks }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Business profile updated',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create advertising order (multi-step form submission)
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
      targetLocation,
      targetRadius,
      reachPackageId,
      requiredViews,
      price,
      duration,
      instructions,
    } = req.body;

    if (!title || !description || !category || !objective) {
      return res.status(400).json({
        success: false,
        message: 'Campaign name, description, category, and objective are all required.',
      });
    }

    // Parse targetLocation from JSON string, object, or multipart bracket notation
    let parsedLocation = {};
    if (typeof targetLocation === 'string') {
      try {
        parsedLocation = JSON.parse(targetLocation);
      } catch {
        parsedLocation = { state: targetLocation };
      }
    } else if (targetLocation && typeof targetLocation === 'object') {
      parsedLocation = targetLocation;
    } else {
      parsedLocation = {
        state: req.body['targetLocation[state]'] || req.body.state || '',
        targetStates: req.body['targetLocation[targetStates]'] || req.body.targetStates || [],
        isNationwide:
          req.body['targetLocation[isNationwide]'] === true ||
          req.body['targetLocation[isNationwide]'] === 'true' ||
          req.body.isNationwide === true ||
          req.body.isNationwide === 'true',
        city: req.body['targetLocation[city]'] || req.body.city || '',
        lga: req.body['targetLocation[lga]'] || req.body.lga || '',
        area: req.body['targetLocation[area]'] || req.body.area || 'General',
        businessAddress: req.body['targetLocation[businessAddress]'] || req.body.businessAddress || '',
      };
    }

    // Normalize targetStates array if sent as string or array
    if (typeof parsedLocation.targetStates === 'string') {
      try {
        parsedLocation.targetStates = JSON.parse(parsedLocation.targetStates);
      } catch {
        parsedLocation.targetStates = parsedLocation.targetStates
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    if (!Array.isArray(parsedLocation.targetStates)) {
      parsedLocation.targetStates = parsedLocation.state ? [parsedLocation.state] : [];
    }

    if (parsedLocation.isNationwide) {
      parsedLocation.targetStates = ['Nationwide'];
      parsedLocation.state = 'Nationwide';
    } else if (parsedLocation.targetStates.length > 0) {
      parsedLocation.state = parsedLocation.state || parsedLocation.targetStates[0];
    } else if (parsedLocation.state) {
      parsedLocation.targetStates = [parsedLocation.state];
    } else {
      parsedLocation.state = 'Lagos';
      parsedLocation.targetStates = ['Lagos'];
    }

    parsedLocation.area = parsedLocation.area || 'General';

    // Parse callToAction
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
    } else if (req.body['callToAction[actionType]'] || req.body['callToAction[targetValue]']) {
      parsedCta = {
        actionType: req.body['callToAction[actionType]'] || 'WhatsApp',
        targetValue: req.body['callToAction[targetValue]'] || '',
      };
    }

    if (!requiredViews || Number(requiredViews) < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum required reach is 1,000 views.',
      });
    }

    // Handle media upload if file present
    let mediaData = { url: '', publicId: '', type: 'image' };
    if (req.file) {
      const uploaded = await processUploadedFile(req.file, 'campaign_media');
      if (uploaded) {
        mediaData = {
          url: uploaded.url,
          publicId: uploaded.publicId,
          type: uploaded.resourceType === 'video' ? 'video' : 'image',
        };
      }
    }

    // Lookup reach package for name if provided
    let reachPackageName = '';
    if (reachPackageId) {
      const pkg = await ReachPackage.findById(reachPackageId);
      if (pkg) reachPackageName = pkg.name;
    }

    const orderNumber = generateOrderNumber();

    const campaign = await Campaign.create({
      orderNumber,
      vendorId: req.user._id,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      objective: objective.trim(),
      media: mediaData,
      adCopy: adCopy || '',
      callToAction: parsedCta,
      targetLocation: {
        state: parsedLocation.state,
        targetStates: parsedLocation.targetStates,
        isNationwide: Boolean(parsedLocation.isNationwide),
        city: parsedLocation.city || '',
        lga: parsedLocation.lga || '',
        area: parsedLocation.area || 'General',
        businessAddress: parsedLocation.businessAddress || '',
      },
      targetRadius: targetRadius || '',
      reachPackageId: reachPackageId || null,
      reachPackageName,
      requiredViews: Number(requiredViews),
      price: Number(price) || 0,
      duration: duration || '24 Hours',
      instructions: instructions || '',
      status: 'Awaiting Payment',
      paymentStatus: 'unpaid',
    });

    // In-app notification for vendor
    await Notification.create({
      userId: req.user._id,
      title: 'Advertising Order Submitted!',
      message: `Your order #${orderNumber} for "${title}" has been received. Please contact Admin on WhatsApp to complete payment.`,
      type: 'info',
      link: `/vendor/orders/${campaign._id}`,
    });

    // Fetch settings for WhatsApp message & number
    const settings = await AdminSettings.findOne().select('whatsappNumber defaultWhatsAppMessage');
    const waNumber = (settings?.whatsappNumber || '+2348012345678').replace(/[^0-9]/g, '');
    const waMsg = encodeURIComponent(
      (settings?.defaultWhatsAppMessage || 'Hello MEDIOVA Team, I have submitted advertising order #{ORDER_NUMBER} for "{TITLE}" and would like to complete payment.')
        .replace('{ORDER_NUMBER}', orderNumber)
        .replace('{TITLE}', title)
    );
    const whatsappUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Advertising Order Received',
        message: `Order #${orderNumber} submitted by ${req.user.name} for "${title}". Awaiting payment confirmation.`,
        type: 'campaign',
        link: `/admin/campaigns/${campaign._id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Advertising order submitted successfully!',
      campaign,
      whatsappUrl,
      orderNumber,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all vendor's campaigns/orders
 * @route   GET /api/vendors/campaigns
 * @access  Private (Vendor)
 */
const getMyCampaigns = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { vendorId: req.user._id };
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      campaigns,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single campaign details with gig stats
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

    // Get gig summary for this campaign (no influencer identities exposed to vendor)
    const gigStats = await Gig.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$assignedViews' },
        },
      },
    ]);

    const totalInfluencers = await Gig.countDocuments({ campaignId: campaign._id });
    const completedGigs = await Gig.countDocuments({ campaignId: campaign._id, status: 'approved' });

    res.status(200).json({
      success: true,
      campaign,
      analytics: {
        totalInfluencers,
        completedGigs,
        completionRate: totalInfluencers > 0 ? Math.round((completedGigs / totalInfluencers) * 100) : 0,
        gigStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get available categories and packages for order form
 * @route   GET /api/vendors/order-options
 * @access  Private (Vendor)
 */
const getOrderOptions = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: 'active', type: 'ad' }).sort({ displayOrder: 1 });
    const objectives = await Category.find({ status: 'active', type: 'objective' }).sort({ displayOrder: 1 });
    const packages = await ReachPackage.find({ status: 'active' }).sort({ displayOrder: 1 });
    const settings = await AdminSettings.findOne().select('availableDurations whatsappNumber manualPaymentInstructions');

    res.status(200).json({
      success: true,
      categories,
      objectives,
      packages,
      durations: settings?.availableDurations || ['24 Hours', '3 Days', '7 Days'],
      adminWhatsapp: settings?.whatsappNumber || '+2348012345678',
      paymentInstructions: settings?.manualPaymentInstructions || '',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit a refund request for an eligible paid campaign
 * @route   POST /api/vendors/refunds
 * @access  Private (Vendor)
 */
const submitRefundRequest = async (req, res, next) => {
  try {
    const { campaignId, reason, description, bankDetails } = req.body;

    if (!campaignId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, refund reason, and detailed explanation are required.',
      });
    }

    if (
      !bankDetails ||
      !bankDetails.accountName ||
      !bankDetails.bankName ||
      !bankDetails.accountNumber
    ) {
      return res.status(400).json({
        success: false,
        message: 'Complete bank account details (Name, Bank, 10-digit NUBAN) are required for refund transfer.',
      });
    }

    // Clean and validate 10-digit Nigerian NUBAN
    const cleanAccountNum = String(bankDetails.accountNumber).replace(/[^0-9]/g, '');
    if (cleanAccountNum.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account number. Nigerian NUBAN accounts must be exactly 10 digits.',
      });
    }

    const campaign = await Campaign.findOne({ _id: campaignId, vendorId: req.user._id });
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or does not belong to your account.',
      });
    }

    if (campaign.paymentStatus !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Refunds can only be requested for campaigns with confirmed payment.',
      });
    }

    if (campaign.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'This campaign has already completed its reach delivery. For disputed results, please submit a formal complaint instead.',
      });
    }

    // Check if an existing refund request is already active
    const existingRefund = await RefundRequest.findOne({
      campaignId: campaign._id,
      status: { $in: ['Requested', 'Under Review', 'Approved', 'Processing', 'Refunded'] },
    });

    if (existingRefund) {
      return res.status(400).json({
        success: false,
        message: `A refund request (#${existingRefund.refundNumber}) has already been submitted for this campaign (Status: ${existingRefund.status}).`,
      });
    }

    const refundNumber = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const refund = await RefundRequest.create({
      refundNumber,
      campaignId: campaign._id,
      vendorId: req.user._id,
      orderNumber: campaign.orderNumber,
      amount: campaign.price,
      reason,
      description: description.trim(),
      bankDetails: {
        accountName: bankDetails.accountName.trim(),
        bankName: bankDetails.bankName.trim(),
        accountNumber: cleanAccountNum,
      },
      status: 'Requested',
    });

    // Notify vendor
    await Notification.create({
      userId: req.user._id,
      title: 'Refund Request Received',
      message: `Your refund request #${refundNumber} for order #${campaign.orderNumber} (₦${Number(campaign.price).toLocaleString()}) has been received and is under administrative review.`,
      type: 'info',
      link: `/vendor/orders/${campaign._id}`,
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Refund Request Submitted',
        message: `Refund #${refundNumber} submitted by ${req.user.name} for campaign "${campaign.title}" (₦${Number(campaign.price).toLocaleString()}).`,
        type: 'payment',
        link: `/admin/orders/${campaign._id}`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Refund request submitted successfully. It will be reviewed by our finance team within 3-5 business days.',
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
  getMyCampaigns,
  getCampaignDetails,
  getOrderOptions,
  submitRefundRequest,
  getMyRefundRequests,
};
