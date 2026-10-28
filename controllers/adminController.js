const User = require('../models/User');
const InfluencerProfile = require('../models/InfluencerProfile');
const VendorProfile = require('../models/VendorProfile');
const Campaign = require('../models/Campaign');
const Gig = require('../models/Gig');
const GigSubmission = require('../models/GigSubmission');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Category = require('../models/Category');
const ReachPackage = require('../models/ReachPackage');
const AdminSettings = require('../models/AdminSettings');
const RefundRequest = require('../models/RefundRequest');
const Complaint = require('../models/Complaint');
const SupportTicket = require('../models/SupportTicket');
const VerificationSubmission = require('../models/VerificationSubmission');
const Payment = require('../models/Payment');
const { processUploadedFile } = require('../middleware/upload');
const { sendEmail } = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Returns primary frontend URL for notifications
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    const urls = process.env.CLIENT_URL.split(',').map((u) => u.trim());
    const prodUrl = urls.find((u) => u.startsWith('https://'));
    return prodUrl || urls[0] || 'https://mediova.vercel.app';
  }
  return 'https://mediova.vercel.app';
};

// ============================
// DASHBOARD
// ============================
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalVendors,
      totalInfluencers,
      pendingInfluencerVerification,
      newOrders,
      awaitingPayment,
      activeCampaigns,
      completedCampaigns,
      pendingGigReviews,
    ] = await Promise.all([
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ role: 'influencer' }),
      InfluencerProfile.countDocuments({ verificationStatus: 'pending' }),
      Campaign.countDocuments({ status: 'Submitted' }),
      Campaign.countDocuments({ status: 'Awaiting Payment' }),
      Campaign.countDocuments({ status: { $in: ['Active', 'Influencers Assigned', 'Processing'] } }),
      Campaign.countDocuments({ status: 'Completed' }),
      GigSubmission.countDocuments({ reviewStatus: 'pending' }),
    ]);

    // Revenue = sum of confirmed payments
    const revenue = await Campaign.aggregate([
      { $match: { paymentStatus: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    // Payout liability = sum of pending/approved transactions
    const liability = await Transaction.aggregate([
      { $match: { status: { $in: ['pending', 'approved'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // Orders over last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await Campaign.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalVendors,
        totalInfluencers,
        pendingInfluencerVerification,
        newOrders,
        awaitingPayment,
        activeCampaigns,
        completedCampaigns,
        pendingGigReviews,
        totalRevenue: revenue[0]?.total || 0,
        influencerPayoutLiability: liability[0]?.total || 0,
        recentOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// USER MANAGEMENT
// ============================
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status) query.accountStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      users,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { accountStatus } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { accountStatus },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: `User account status set to ${accountStatus}`, user });
  } catch (error) {
    next(error);
  }
};

// ============================
// INFLUENCER MANAGEMENT
// ============================
const getAllInfluencers = async (req, res, next) => {
  try {
    const {
      search,
      state,
      category,
      minViews,
      maxViews,
      availability,
      verificationStatus,
      page = 1,
      limit = 20,
    } = req.query;

    const profileQuery = {};
    if (state) profileQuery.state = { $regex: state, $options: 'i' };
    if (category) profileQuery.categories = category;
    if (minViews) profileQuery.verifiedViews = { $gte: Number(minViews) };
    if (maxViews) profileQuery.verifiedViews = { ...profileQuery.verifiedViews, $lte: Number(maxViews) };
    if (availability !== undefined) profileQuery.availability = availability === 'true';
    if (verificationStatus) profileQuery.verificationStatus = verificationStatus;

    const userQuery = { role: 'influencer' };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Find matching users
    const matchingUsers = await User.find(userQuery).select('_id name email phone profileImage accountStatus createdAt');
    const userIds = matchingUsers.map((u) => u._id);

    const total = await InfluencerProfile.countDocuments({
      ...profileQuery,
      userId: { $in: userIds },
    });

    const profiles = await InfluencerProfile.find({
      ...profileQuery,
      userId: { $in: userIds },
    })
      .populate('userId', 'name email phone profileImage accountStatus createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Attach latest verification submission for each influencer so admin can view/download video directly
    const influencerUserIds = profiles.map((p) => p.userId?._id).filter(Boolean);
    const submissions = await VerificationSubmission.find({
      influencerId: { $in: influencerUserIds },
    }).sort({ createdAt: -1 });

    const submissionMap = {};
    submissions.forEach((sub) => {
      const key = sub.influencerId.toString();
      if (!submissionMap[key]) {
        submissionMap[key] = sub;
      }
    });

    const enrichedProfiles = profiles.map((p) => {
      const obj = p.toObject();
      if (p.userId?._id) {
        obj.latestVerification = submissionMap[p.userId._id.toString()] || null;
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      influencers: enrichedProfiles,
    });
  } catch (error) {
    next(error);
  }
};

const getInfluencerById = async (req, res, next) => {
  try {
    const profile = await InfluencerProfile.findOne({ userId: req.params.id })
      .populate('userId', 'name email phone profileImage accountStatus createdAt');

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Influencer not found' });
    }

    const gigs = await Gig.find({ influencerId: req.params.id })
      .populate('campaignId', 'title status')
      .sort({ createdAt: -1 })
      .limit(10);

    const latestVerification = await VerificationSubmission.findOne({ influencerId: req.params.id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, profile, latestVerification, recentGigs: gigs });
  } catch (error) {
    next(error);
  }
};

const getVerificationSubmissions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    const submissions = await VerificationSubmission.find(query)
      .populate('influencerId', 'name email phone whatsappNumber country countryCode location profileImage influencerVerificationStatus')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await VerificationSubmission.countDocuments(query);

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

const reviewVerificationSubmission = async (req, res, next) => {
  try {
    const { decision, verifiedViews, adminNotes, rejectionReason } = req.body;
    // decision: 'verified' | 'rejected'

    if (!['verified', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be either 'verified' or 'rejected'.",
      });
    }

    const submission = await VerificationSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Verification submission not found.' });
    }

    const influencerId = submission.influencerId;
    submission.status = decision;
    submission.adminDecision = decision;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    if (verifiedViews !== undefined) submission.verifiedViews = Number(verifiedViews);
    if (rejectionReason) submission.rejectionReason = rejectionReason;
    if (adminNotes) submission.notes = adminNotes;

    submission.history.push({
      action: decision === 'verified' ? 'admin_approved' : 'admin_rejected',
      status: decision,
      notes: adminNotes || rejectionReason || '',
      timestamp: new Date(),
      by: req.user._id,
    });
    await submission.save();

    // Update InfluencerProfile and User
    const profile = await InfluencerProfile.findOne({ userId: influencerId });
    if (profile) {
      profile.verificationStatus = decision;
      if (verifiedViews !== undefined) profile.verifiedViews = Number(verifiedViews);
      if (adminNotes) profile.adminNotes = adminNotes;
      await profile.save();
    }

    await User.findByIdAndUpdate(influencerId, {
      influencerVerificationStatus: decision,
    });

    // Notify influencer
    await Notification.create({
      userId: influencerId,
      title: decision === 'verified' ? '✅ Account Verified & Gig-Eligible!' : '⚠️ Verification Video Rejected',
      message:
        decision === 'verified'
          ? `Congratulations! Your verification video has been approved by the Admin team. You are now officially verified and eligible for paid gig assignments!`
          : `Your verification submission was not approved: ${rejectionReason || adminNotes || 'Video did not meet verification criteria'}. You may submit a corrected verification video.`,
      type: decision === 'verified' ? 'success' : 'warning',
      link: '/influencer/dashboard',
    });

    res.status(200).json({
      success: true,
      message: `Verification submission ${decision} successfully.`,
      submission,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

const verifyInfluencer = async (req, res, next) => {
  try {
    const { verificationStatus, verifiedViews, adminNotes, rejectionReason } = req.body;

    const profile = await InfluencerProfile.findOne({ userId: req.params.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Influencer not found' });

    profile.verificationStatus = verificationStatus || profile.verificationStatus;
    if (verifiedViews !== undefined) profile.verifiedViews = Number(verifiedViews);
    if (adminNotes) profile.adminNotes = adminNotes;
    await profile.save();

    await User.findByIdAndUpdate(req.params.id, {
      influencerVerificationStatus: verificationStatus,
    });

    // Also update any pending verification submission
    await VerificationSubmission.updateMany(
      { influencerId: req.params.id, status: { $in: ['pending', 'under_review'] } },
      {
        status: verificationStatus,
        adminDecision: verificationStatus,
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || '',
        notes: adminNotes || '',
      }
    );

    await Notification.create({
      userId: req.params.id,
      title: verificationStatus === 'verified' ? '✅ Reach Verified!' : '⚠️ Verification Update',
      message:
        verificationStatus === 'verified'
          ? `Your WhatsApp reach of ${Number(verifiedViews).toLocaleString()} views has been verified by the Admin. You are now eligible for gig assignments!`
          : `Your reach verification status has been updated to: ${verificationStatus}. ${adminNotes || rejectionReason || ''}`,
      type: verificationStatus === 'verified' ? 'success' : 'warning',
    });

    res.status(200).json({
      success: true,
      message: `Influencer verification status updated to: ${verificationStatus}`,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

const updateInfluencerAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;
    const profile = await InfluencerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { availability },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Influencer not found' });
    res.status(200).json({ success: true, message: 'Availability updated', profile });
  } catch (error) {
    next(error);
  }
};

// ============================
// VENDOR MANAGEMENT
// ============================
const getAllVendors = async (req, res, next) => {
  try {
    const { search, state, page = 1, limit = 20 } = req.query;
    const userQuery = { role: 'vendor' };
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const matchingUsers = await User.find(userQuery).select('_id');
    const userIds = matchingUsers.map((u) => u._id);

    const profileQuery = { userId: { $in: userIds } };
    if (state) profileQuery.state = { $regex: state, $options: 'i' };

    const total = await VendorProfile.countDocuments(profileQuery);
    const vendors = await VendorProfile.find(profileQuery)
      .populate('userId', 'name email phone accountStatus createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, pages: Math.ceil(total / Number(limit)), page: Number(page), vendors });
  } catch (error) {
    next(error);
  }
};

const getVendorById = async (req, res, next) => {
  try {
    const profile = await VendorProfile.findOne({ userId: req.params.id })
      .populate('userId', 'name email phone accountStatus createdAt');

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const campaigns = await Campaign.find({ vendorId: req.params.id }).sort({ createdAt: -1 });
    const totalSpent = campaigns
      .filter((c) => c.paymentStatus === 'confirmed')
      .reduce((sum, c) => sum + (c.price || 0), 0);

    res.status(200).json({
      success: true,
      vendor: {
        user: profile.userId,
        profile,
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c) => ['Active', 'Processing', 'Influencers Assigned'].includes(c.status)).length,
        totalSpent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// CAMPAIGN MANAGEMENT
// ============================
const getAllCampaigns = async (req, res, next) => {
  try {
    const { status, paymentStatus, category, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (category) query.category = { $regex: category, $options: 'i' };
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, pages: Math.ceil(total / Number(limit)), page: Number(page), campaigns });
  } catch (error) {
    next(error);
  }
};

const getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('vendorId', 'name email phone whatsappNumber country location');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const vendorProfile = await VendorProfile.findOne({ userId: campaign.vendorId?._id });

    const gigs = await Gig.find({ campaignId: campaign._id })
      .populate('influencerId', 'name email whatsappNumber profileImage')
      .sort({ createdAt: -1 });

    const payment = await Payment.findOne({ campaignId: campaign._id });

    const gigStats = {
      total: gigs.length,
      assigned: gigs.filter((g) => g.status === 'assigned').length,
      accepted: gigs.filter((g) => g.status === 'accepted').length,
      submitted: gigs.filter((g) => g.status === 'submitted').length,
      approved: gigs.filter((g) => g.status === 'approved').length,
      rejected: gigs.filter((g) => g.status === 'rejected').length,
      declined: gigs.filter((g) => g.status === 'declined').length,
    };

    res.status(200).json({ success: true, campaign, vendorProfile, gigs, gigStats, payment });
  } catch (error) {
    next(error);
  }
};

const verifyCampaignPayment = async (req, res, next) => {
  try {
    const { decision, rejectionReason, notes } = req.body;
    // decision: 'confirmed' | 'rejected'

    if (!['confirmed', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'confirmed' or 'rejected'." });
    }

    const campaign = await Campaign.findById(req.params.id).populate('vendorId', 'name email phone whatsappNumber country location');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    campaign.paymentStatus = decision;
    campaign.status = decision === 'confirmed' ? 'Payment Confirmed' : 'Awaiting Payment';
    campaign.paymentReview = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      decision,
      rejectionReason: rejectionReason || '',
    };
    if (notes) campaign.notes = notes;
    await campaign.save();

    // Update Payment record
    const payment = await Payment.findOne({ campaignId: campaign._id });
    if (payment) {
      payment.status = decision;
      payment.reviewedBy = req.user._id;
      payment.reviewedAt = new Date();
      payment.rejectionReason = rejectionReason || '';
      payment.adminNotes = notes || '';
      await payment.save();
    }

    // In-app notification for vendor
    await Notification.create({
      userId: campaign.vendorId._id,
      title: decision === 'confirmed' ? '✅ Payment Verified & Confirmed' : '⚠️ Payment Verification Issue',
      message:
        decision === 'confirmed'
          ? `Your payment for order #${campaign.orderNumber} has been verified and confirmed. Campaign execution is now in progress.`
          : `Payment verification issue on order #${campaign.orderNumber}: ${rejectionReason || 'Receipt could not be verified'}. Please review your payment details.`,
      type: decision === 'confirmed' ? 'success' : 'warning',
      link: `/vendor/orders/${campaign._id}`,
    });

    res.status(200).json({
      success: true,
      message: `Campaign payment ${decision} successfully`,
      campaign,
      payment,
    });
  } catch (error) {
    next(error);
  }
};

const submitCompletedWork = async (req, res, next) => {
  try {
    const { summary, notes } = req.body;
    if (!summary || !summary.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Completion summary is required.',
      });
    }

    const campaign = await Campaign.findById(req.params.id).populate('vendorId', 'name email phone whatsappNumber country location');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const files = req.files || (req.file ? [req.file] : []);
    const evidenceUrls = [];

    for (const f of files) {
      const uploaded = await processUploadedFile(f, 'completed_work_evidence');
      if (uploaded) {
        evidenceUrls.push({
          url: uploaded.url,
          caption: f.originalname || 'Completion Proof',
          publicId: uploaded.publicId,
          mediaType: uploaded.resourceType === 'video' ? 'video' : 'image',
          uploadedAt: new Date(),
        });
      }
    }

    campaign.status = 'Submitted for Vendor Review';
    campaign.completedWork = {
      summary: summary.trim(),
      notes: notes || '',
      evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : (campaign.completedWork?.evidenceUrls || []),
      submittedAt: new Date(),
      submittedBy: req.user._id,
      vendorReviewStatus: 'submitted',
      vendorReviewComment: '',
      history: [
        ...(campaign.completedWork?.history || []),
        {
          action: 'admin_submitted',
          notes: summary.trim(),
          timestamp: new Date(),
          by: req.user._id,
        },
      ],
    };

    await campaign.save();

    await Notification.create({
      userId: campaign.vendorId._id,
      title: '🎯 Campaign Work Ready for Your Review',
      message: `Admin has submitted completed work details for Order #${campaign.orderNumber} ("${campaign.title}"). Please review and accept the work.`,
      type: 'info',
      link: `/vendor/orders/${campaign._id}`,
    });

    res.status(200).json({
      success: true,
      message: 'Completed work submitted for vendor review successfully.',
      campaign,
    });
  } catch (error) {
    next(error);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    const payments = await Payment.find(query)
      .populate('vendorId', 'name email phone whatsappNumber')
      .populate('campaignId', 'orderNumber title price currency paymentStatus status targetCountry targetRegion')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

const updateCampaignStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus, notes, rejectionReason, startDate, endDate } = req.body;
    const campaign = await Campaign.findById(req.params.id).populate('vendorId', 'name email phone whatsappNumber country location');
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    if (status) campaign.status = status;
    if (paymentStatus) campaign.paymentStatus = paymentStatus;
    if (notes) campaign.notes = notes;
    if (rejectionReason) campaign.rejectionReason = rejectionReason;
    if (startDate) campaign.startDate = new Date(startDate);
    if (endDate) campaign.endDate = new Date(endDate);

    await campaign.save();

    // Send email/notification to vendor based on status change
    if (paymentStatus === 'confirmed') {
      await Notification.create({
        userId: campaign.vendorId._id,
        title: '💰 Payment Confirmed!',
        message: `Payment for order #${campaign.orderNumber} (${campaign.title}) has been confirmed. Campaign is being prepared.`,
        type: 'payment',
      });
    }

    if (status === 'Completed') {
      const gigCount = await Gig.countDocuments({ campaignId: campaign._id, status: 'approved' });
      const submissions = await GigSubmission.find({ campaignId: campaign._id, reviewStatus: 'approved' });
      const totalVerifiedViews = submissions.reduce((acc, s) => acc + s.reportedViews, 0);

      await Notification.create({
        userId: campaign.vendorId._id,
        title: '🎉 Campaign Completed!',
        message: `Your campaign "${campaign.title}" has completed with ${gigCount} influencers and ${totalVerifiedViews.toLocaleString()} verified views.`,
        type: 'success',
      });
    }

    res.status(200).json({ success: true, message: 'Campaign updated', campaign });
  } catch (error) {
    next(error);
  }
};

// ============================
// GIG MANAGEMENT
// ============================
const assignGigs = async (req, res, next) => {
  try {
    const { campaignId, assignments } = req.body;
    // assignments = [{ influencerId, assignedViews, reward }]

    if (!campaignId || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ success: false, message: 'campaignId and assignments array are required.' });
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    // Enforce strict backend gig-eligibility verification check
    for (const assignment of assignments) {
      const { influencerId } = assignment;
      const influencerProfile = await InfluencerProfile.findOne({ userId: influencerId });
      const influencerUser = await User.findById(influencerId);

      if (!influencerProfile || influencerProfile.verificationStatus !== 'verified') {
        return res.status(400).json({
          success: false,
          message: `Influencer "${influencerUser?.name || influencerId}" is not verified (status: ${influencerProfile?.verificationStatus || 'none'}). Only approved, verified influencers are eligible for gig assignments.`,
        });
      }
    }

    const createdGigs = [];
    let totalNewReach = 0;

    for (const assignment of assignments) {
      const { influencerId, assignedViews, reward } = assignment;

      // Prevent duplicate assignment
      const existing = await Gig.findOne({ campaignId, influencerId });
      if (existing) continue;

      const gigNumber = `GIG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      const gig = await Gig.create({
        gigNumber,
        campaignId,
        influencerId,
        assignedViews: Number(assignedViews),
        reward: Number(reward),
        status: 'assigned',
      });

      createdGigs.push(gig);
      totalNewReach += Number(assignedViews);

      // Notify influencer
      const influencer = await User.findById(influencerId);
      if (influencer) {
        await Notification.create({
          userId: influencerId,
          title: '🎯 New Gig Assigned!',
          message: `You have been assigned a new advertising gig for "${campaign.title}". Reward: ₦${Number(reward).toLocaleString()}. Check your gigs dashboard to accept.`,
          type: 'gig',
          link: `/influencer/gigs/${gig._id}`,
        });

        const clientUrl = getClientUrl();
        const emailData = emailTemplates.gigAssigned({
          name: influencer.name,
          campaignTitle: campaign.title,
          reward,
          gigUrl: `${clientUrl}/influencer/gigs/${gig._id}`,
          instructions: campaign.instructions || campaign.adCopy || '',
          duration: campaign.duration || '24 Hours',
          deadline: campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : '',
        });

        // Send email only after gig has been successfully saved to DB.
        // If email service fails, the gig assignment must remain successful and NOT be rolled back.
        try {
          const emailResult = await sendEmail({
            to: influencer.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });
          if (emailResult && emailResult.error) {
            console.error(`[assignGigs] Email notification failed for influencer (${influencer._id}): ${emailResult.error}`);
          }
        } catch (emailErr) {
          console.error(`[assignGigs] Email dispatch exception for influencer (${influencer._id}): ${emailErr.message}`);
        }
      }
    }

    // Update campaign assigned reach
    campaign.assignedReach += totalNewReach;
    if (campaign.status === 'Approved' || campaign.status === 'Processing') {
      campaign.status = 'Influencers Assigned';
    }
    await campaign.save();

    res.status(201).json({
      success: true,
      message: `${createdGigs.length} gigs assigned successfully`,
      gigs: createdGigs,
      assignedReach: campaign.assignedReach,
    });
  } catch (error) {
    next(error);
  }
};

const reviewGigSubmission = async (req, res, next) => {
  try {
    const { gigId, reviewStatus, reviewComment } = req.body;

    const submission = await GigSubmission.findOne({ gigId });
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    const gig = await Gig.findById(gigId).populate('campaignId', 'title');
    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    submission.reviewStatus = reviewStatus;
    submission.reviewComment = reviewComment || '';
    submission.reviewedAt = new Date();
    await submission.save();

    if (reviewStatus === 'approved') {
      gig.status = 'approved';
      gig.approvedAt = new Date();
      await gig.save();

      // Update influencer stats
      const profile = await InfluencerProfile.findOne({ userId: gig.influencerId });
      if (profile) {
        profile.completedGigs += 1;
        profile.successfulGigs += 1;
        await profile.save();
      }

      // Create earning record
      await Transaction.create({
        influencerId: gig.influencerId,
        gigId: gig._id,
        campaignId: gig.campaignId,
        amount: gig.reward,
        type: 'gig_reward',
        status: 'approved',
      });

      await Notification.create({
        userId: gig.influencerId,
        title: '✅ Gig Approved & Earnings Credited',
        message: `Your proof for "${gig.campaignId.title}" was approved! ₦${gig.reward.toLocaleString()} has been credited to your earnings.`,
        type: 'payment',
      });
    } else if (reviewStatus === 'rejected') {
      gig.status = 'rejected';
      gig.rejectionReason = reviewComment || 'Proof did not meet requirements';
      gig.rejectedAt = new Date();
      await gig.save();

      const profile = await InfluencerProfile.findOne({ userId: gig.influencerId });
      if (profile) {
        profile.completedGigs += 1;
        profile.reliabilityScore = Math.max(0, profile.reliabilityScore - 5);
        await profile.save();
      }

      await Notification.create({
        userId: gig.influencerId,
        title: '⚠️ Gig Submission Rejected',
        message: `Your proof for "${gig.campaignId.title}" was not approved. Reason: ${reviewComment || 'Proof insufficient'}. Please re-submit or contact Admin.`,
        type: 'warning',
      });
    }

    res.status(200).json({ success: true, message: `Submission ${reviewStatus}`, submission, gig });
  } catch (error) {
    next(error);
  }
};

const getAllGigSubmissions = async (req, res, next) => {
  try {
    const { reviewStatus, page = 1, limit = 20 } = req.query;
    const query = {};
    if (reviewStatus && reviewStatus !== 'all') query.reviewStatus = reviewStatus;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await GigSubmission.countDocuments(query);
    const submissions = await GigSubmission.find(query)
      .populate('influencerId', 'name email profileImage')
      .populate({ path: 'gigId', populate: { path: 'campaignId', select: 'title' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, submissions });
  } catch (error) {
    next(error);
  }
};

const getAllGigs = async (req, res, next) => {
  try {
    const { status, campaignId, influencerId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (campaignId) query.campaignId = campaignId;
    if (influencerId) query.influencerId = influencerId;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Gig.countDocuments(query);
    const gigs = await Gig.find(query)
      .populate('influencerId', 'name email location')
      .populate('campaignId', 'title category budget')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const formatted = gigs.map((g) => ({
      _id: g._id,
      gigNumber: g.gigNumber,
      status: g.status,
      reward: g.reward,
      assignedViews: g.assignedViews,
      assignedAt: g.assignedAt || g.createdAt,
      influencer: g.influencerId ? {
        name: g.influencerId.name,
        email: g.influencerId.email,
        location: g.influencerId.location,
      } : null,
      campaign: g.campaignId ? {
        _id: g.campaignId._id,
        title: g.campaignId.title,
        category: g.campaignId.category,
      } : null,
    }));

    res.status(200).json({ success: true, total, gigs: formatted });
  } catch (error) {
    next(error);
  }
};

const getGigById = async (req, res, next) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('influencerId', 'name email phone location')
      .populate('campaignId', 'title category budget requirements');

    if (!gig) return res.status(404).json({ success: false, message: 'Gig not found' });

    const submission = await GigSubmission.findOne({ gigId: gig._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      gig: {
        _id: gig._id,
        gigNumber: gig.gigNumber,
        status: gig.status,
        reward: gig.reward,
        assignedViews: gig.assignedViews,
        assignedAt: gig.assignedAt || gig.createdAt,
        influencer: gig.influencerId,
        campaign: gig.campaignId,
        proofImages: submission?.proofImages || [],
        submission,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// INFLUENCER MATCHING
// ============================
const matchInfluencers = async (req, res, next) => {
  try {
    const {
      state,
      states,
      isNationwide,
      city,
      lga,
      area,
      category,
      minViews,
      maxViews,
      availability,
      excludeCampaignId,
    } = req.query;

    const profileQuery = { verificationStatus: 'verified' };

    // Support multi-state and nationwide targeting
    const isAllNation =
      isNationwide === 'true' ||
      isNationwide === true ||
      state === 'Nationwide' ||
      states === 'Nationwide';

    if (!isAllNation) {
      let targetStateList = [];
      if (states) {
        targetStateList =
          typeof states === 'string'
            ? states.split(',').map((s) => s.trim()).filter(Boolean)
            : states;
      } else if (state && state !== 'all') {
        targetStateList = [state];
      }

      if (targetStateList.length === 1) {
        profileQuery.state = { $regex: targetStateList[0], $options: 'i' };
      } else if (targetStateList.length > 1) {
        profileQuery.state = {
          $in: targetStateList.map((s) => new RegExp(`^${s}$`, 'i')),
        };
      }
    }

    if (city) profileQuery.city = { $regex: city, $options: 'i' };
    if (lga) profileQuery.lga = { $regex: lga, $options: 'i' };
    if (area && !isAllNation) {
      profileQuery.$or = [
        { area: { $regex: area, $options: 'i' } },
        { additionalAreas: { $regex: area, $options: 'i' } },
      ];
    }
    if (category) profileQuery.categories = { $in: [category] };
    if (minViews) profileQuery.verifiedViews = { $gte: Number(minViews) };
    if (maxViews) profileQuery.verifiedViews = { ...profileQuery.verifiedViews, $lte: Number(maxViews) };
    if (availability !== undefined) profileQuery.availability = availability === 'true';

    let profiles = await InfluencerProfile.find(profileQuery)
      .populate('userId', 'name email profileImage accountStatus')
      .sort({ verifiedViews: -1 });

    // Exclude influencers already assigned to the campaign
    if (excludeCampaignId) {
      const alreadyAssigned = await Gig.find({ campaignId: excludeCampaignId }).distinct('influencerId');
      profiles = profiles.filter(
        (p) => !alreadyAssigned.some((id) => id.toString() === p.userId._id.toString())
      );
    }

    // Filter only active accounts
    profiles = profiles.filter((p) => p.userId && p.userId.accountStatus === 'active');

    res.status(200).json({ success: true, count: profiles.length, influencers: profiles });
  } catch (error) {
    next(error);
  }
};

// ============================
// EARNINGS MANAGEMENT
// ============================
const getAllTransactions = async (req, res, next) => {
  try {
    const { status, influencerId, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (influencerId) query.influencerId = influencerId;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate('influencerId', 'name email')
      .populate('campaignId', 'title')
      .populate('gigId', 'gigNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, transactions });
  } catch (error) {
    next(error);
  }
};

const markTransactionPaid = async (req, res, next) => {
  try {
    const { paymentReference, notes } = req.body;
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    transaction.status = 'paid';
    transaction.paidAt = new Date();
    if (paymentReference) transaction.paymentReference = paymentReference;
    if (notes) transaction.notes = notes;
    await transaction.save();

    await Notification.create({
      userId: transaction.influencerId,
      title: '💸 Payment Sent!',
      message: `Your earnings of ₦${transaction.amount.toLocaleString()} have been transferred to your bank account.`,
      type: 'payment',
    });

    res.status(200).json({ success: true, message: 'Transaction marked as paid', transaction });
  } catch (error) {
    next(error);
  }
};

// ============================
// CATEGORY MANAGEMENT
// ============================
const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    const categories = await Category.find(query).sort({ displayOrder: 1 });
    res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

// ============================
// REACH PACKAGE MANAGEMENT
// ============================
const getPackages = async (req, res, next) => {
  try {
    const packages = await ReachPackage.find().sort({ displayOrder: 1 });
    res.status(200).json({ success: true, packages });
  } catch (error) {
    next(error);
  }
};

const createPackage = async (req, res, next) => {
  try {
    const pkg = await ReachPackage.create(req.body);
    res.status(201).json({ success: true, package: pkg });
  } catch (error) {
    next(error);
  }
};

const updatePackage = async (req, res, next) => {
  try {
    const pkg = await ReachPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    res.status(200).json({ success: true, package: pkg });
  } catch (error) {
    next(error);
  }
};

const deletePackage = async (req, res, next) => {
  try {
    await ReachPackage.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Package deleted' });
  } catch (error) {
    next(error);
  }
};

// ============================
// ADMIN SETTINGS
// ============================
const getSettings = async (req, res, next) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.status(200).json({ success: true, message: 'Settings updated', settings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test Gmail SMTP configuration (Admin-only)
 * @route   POST /api/admin/test-email
 * @access  Private/Admin
 */
const testEmailService = async (req, res, next) => {
  try {
    const { to } = req.body;
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid recipient email address (e.g. { "to": "user@example.com" }).',
      });
    }

    const testSubject = 'MEDIOVA Gmail SMTP Integration Test';
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #047857; margin-top: 0;">MEDIOVA Gmail SMTP Test Email</h2>
        <p>This is a verification email from <strong>MEDIOVA</strong> confirming that Gmail SMTP with Nodemailer is working properly.</p>
        <div style="background: #f8fafc; padding: 14px; border-radius: 6px; margin: 16px 0; font-size: 14px;">
          <p style="margin: 0 0 6px;"><strong>Recipient:</strong> ${to}</p>
          <p style="margin: 0 0 6px;"><strong>Sender:</strong> ${process.env.NODEMAILER_EMAIL || 'Configured Gmail Account'}</p>
          <p style="margin: 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">If you received this message, the Gmail SMTP integration is operating successfully.</p>
      </div>
    `;
    const testText = `MEDIOVA Gmail SMTP Integration Test\nSent to: ${to}\nTimestamp: ${new Date().toISOString()}`;

    const info = await sendEmail({
      to,
      subject: testSubject,
      html: testHtml,
      text: testText,
    });

    if (info.error) {
      return res.status(502).json({
        success: false,
        message: 'Failed to send test email via Gmail SMTP.',
        error: info.error,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Test email successfully dispatched to ${to}.`,
      messageId: info.messageId,
      accepted: info.accepted,
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// REFUND MANAGEMENT
// ============================
const getAllRefunds = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await RefundRequest.countDocuments(query);
    const refunds = await RefundRequest.find(query)
      .populate('vendorId', 'name email phone')
      .populate('campaignId', 'title orderNumber price status paymentStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      refunds,
    });
  } catch (error) {
    next(error);
  }
};

const updateRefundStatus = async (req, res, next) => {
  try {
    const { status, adminNotes, rejectionReason, transferReference } = req.body;
    const refund = await RefundRequest.findById(req.params.id)
      .populate('vendorId', 'name email')
      .populate('campaignId');

    if (!refund) {
      return res.status(404).json({ success: false, message: 'Refund request not found.' });
    }

    if (status) refund.status = status;
    if (adminNotes !== undefined) refund.adminNotes = adminNotes;
    if (rejectionReason !== undefined) refund.rejectionReason = rejectionReason;
    if (transferReference) refund.transferReference = transferReference;

    refund.processedBy = req.user._id;
    refund.processedAt = new Date();

    // If marked Refunded, ensure campaign status is safely synced and transfer reference is recorded
    if (status === 'Refunded') {
      if (!transferReference) {
        return res.status(400).json({
          success: false,
          message: 'A legitimate bank transfer reference number is required to mark a refund as completed.',
        });
      }
      await Campaign.findByIdAndUpdate(refund.campaignId._id, {
        paymentStatus: 'refunded',
        status: 'Cancelled',
      });
    }

    await refund.save();

    // In-app notification to vendor
    await Notification.create({
      userId: refund.vendorId._id,
      title: `Refund Request ${status}`,
      message: `Your refund request #${refund.refundNumber} for order #${refund.orderNumber} has been updated to "${status}".${transferReference ? ` Ref: ${transferReference}` : ''}`,
      type: status === 'Refunded' ? 'payment' : 'info',
      link: `/vendor/orders/${refund.campaignId._id}`,
    });

    res.status(200).json({
      success: true,
      message: `Refund status updated to ${status}`,
      refund,
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// COMPLAINTS & APPEALS MANAGEMENT
// ============================
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, userRole, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;
    if (userRole) query.userRole = userRole;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .populate('userId', 'name email phone role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate(
      'userId',
      'name email phone role'
    );
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }
    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

const updateComplaint = async (req, res, next) => {
  try {
    const { status, internalInvestigationNotes, resolutionSummary } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    if (status) complaint.status = status;
    if (internalInvestigationNotes !== undefined)
      complaint.internalInvestigationNotes = internalInvestigationNotes;
    if (resolutionSummary !== undefined)
      complaint.resolutionSummary = resolutionSummary;

    if (status === 'Resolved' || status === 'Closed') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Notify user
    await Notification.create({
      userId: complaint.userId,
      title: `Complaint Status: ${status}`,
      message: `Your complaint #${complaint.complaintNumber} ("${complaint.subject}") has been updated to ${status}.${resolutionSummary ? ` Resolution: ${resolutionSummary}` : ''}`,
      type: status === 'Resolved' ? 'success' : 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully.',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

// ============================
// SUPPORT TICKETS MANAGEMENT
// ============================
const getAllSupportTickets = async (req, res, next) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await SupportTicket.countDocuments(query);
    const tickets = await SupportTicket.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / Number(limit)),
      page: Number(page),
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

const updateSupportTicket = async (req, res, next) => {
  try {
    const { status, adminReply } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Support ticket not found.' });
    }

    if (status) ticket.status = status;
    if (adminReply !== undefined) {
      ticket.adminReply = adminReply;
      ticket.repliedAt = new Date();
      ticket.assignedTo = req.user._id;
    }

    await ticket.save();

    // If ticket was from a logged-in user, send in-app notification
    if (ticket.userId) {
      await Notification.create({
        userId: ticket.userId,
        title: `Support Ticket Response (${ticket.ticketNumber})`,
        message: adminReply || `Your support ticket #${ticket.ticketNumber} is now ${status}.`,
        type: 'info',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket updated.',
      ticket,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllInfluencers,
  getInfluencerById,
  verifyInfluencer,
  getVerificationSubmissions,
  reviewVerificationSubmission,
  updateInfluencerAvailability,
  getAllVendors,
  getVendorById,
  getAllCampaigns,
  getCampaignById,
  updateCampaignStatus,
  verifyCampaignPayment,
  submitCompletedWork,
  getAllPayments,
  assignGigs,
  reviewGigSubmission,
  getAllGigSubmissions,
  getAllGigs,
  getGigById,
  matchInfluencers,
  getAllTransactions,
  markTransactionPaid,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getSettings,
  updateSettings,
  testEmailService,
  getAllRefunds,
  updateRefundStatus,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  getAllSupportTickets,
  updateSupportTicket,
};
