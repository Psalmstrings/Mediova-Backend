const InfluencerProfile = require('../models/InfluencerProfile');
const User = require('../models/User');
const Gig = require('../models/Gig');
const GigSubmission = require('../models/GigSubmission');
const VerificationSubmission = require('../models/VerificationSubmission');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Campaign = require('../models/Campaign');
const TermsAcceptance = require('../models/TermsAcceptance');
const { processUploadedFile } = require('../middleware/upload');
const { normalizePhoneNumber, isValidPhoneNumber } = require('../utils/locations');

/**
 * @desc    Get current influencer's full profile
 * @route   GET /api/influencers/profile
 * @access  Private (Influencer)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await InfluencerProfile.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone whatsappNumber country countryCode location influencerVerificationStatus profileImage'
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Influencer profile not found' });
    }

    // Also fetch latest verification submission if available
    const latestVerification = await VerificationSubmission.findOne({ influencerId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, profile, verificationSubmission: latestVerification });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update influencer profile details
 * @route   PUT /api/influencers/profile
 * @access  Private (Influencer)
 */
const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      whatsappNumber,
      phone,
      country,
      region,
      subDivision,
      area,
      state, // backward compatibility
      lga, // backward compatibility
      categories,
    } = req.body;

    const rawPhone = whatsappNumber || phone;
    let normalizedWhatsapp = null;
    if (rawPhone) {
      normalizedWhatsapp = normalizePhoneNumber(rawPhone);
      if (!isValidPhoneNumber(normalizedWhatsapp)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid WhatsApp phone number in international format.',
        });
      }
    }

    // Update user record
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

    const profile = await InfluencerProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(normalizedWhatsapp && { whatsappNumber: normalizedWhatsapp }),
        ...(resolvedRegion && { state: resolvedRegion }),
        ...(resolvedSub !== undefined && { city: resolvedSub, lga: resolvedSub }),
        ...(area !== undefined && { area }),
        ...(categories && { categories }),
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle or set availability
 * @route   PATCH /api/influencers/availability
 * @access  Private (Influencer)
 */
const updateAvailability = async (req, res, next) => {
  try {
    const { availability } = req.body;
    const profile = await InfluencerProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    profile.availability = typeof availability === 'boolean' ? availability : !profile.availability;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Availability updated to ${profile.availability ? 'Available for Gigs' : 'Currently Unavailable'}`,
      availability: profile.availability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bank account details
 * @route   PUT /api/influencers/bank-details
 * @access  Private (Influencer)
 */
const updateBankDetails = async (req, res, next) => {
  try {
    const { accountName, bankName, accountNumber, currency = 'NGN', routingOrSortCode = '' } = req.body;

    if (!accountName || !bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Account Name, Bank Name, and Account/IBAN Number are required.',
      });
    }

    const cleanAccountNum = String(accountNumber).trim();
    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    profile.bankDetails = {
      accountName: accountName.trim(),
      bankName: bankName.trim(),
      accountNumber: cleanAccountNum,
    };
    profile.payoutStatus = 'verified';

    if (!profile.payoutAuditLog) {
      profile.payoutAuditLog = [];
    }
    profile.payoutAuditLog.push({
      action: 'bank_details_updated',
      timestamp: new Date(),
      note: `Bank updated to ${bankName} (${cleanAccountNum.slice(-4)}) [${currency}]`,
    });

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Bank details saved securely',
      payoutStatus: profile.payoutStatus,
      bankDetails: {
        accountName: profile.bankDetails.accountName,
        bankName: profile.bankDetails.bankName,
        accountNumber: `•••• •••• ${cleanAccountNum.slice(-4)}`,
        rawAccountNumber: cleanAccountNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit account verification video (Mandatory before gig eligibility)
 * @route   POST /api/influencers/verify-account
 * @access  Private (Influencer)
 */
const submitVerificationVideo = async (req, res, next) => {
  try {
    const file = req.file || (req.files && req.files[0]);

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid verification video recording to upload.',
      });
    }

    // Process and store video in Cloudinary or local fallback
    const uploaded = await processUploadedFile(file, 'influencer_verifications');
    if (!uploaded || !uploaded.url) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload verification video. Please try again.',
      });
    }

    const notes = req.body.notes || '';
    const averageViews = Number(req.body.averageViews) || 0;

    // Check for existing pending/under_review submission
    let submission = await VerificationSubmission.findOne({
      influencerId: req.user._id,
      status: { $in: ['pending', 'under_review'] },
    });

    if (submission) {
      submission.videoUrl = uploaded.url;
      submission.publicId = uploaded.publicId;
      submission.fileFormat = uploaded.format || 'mp4';
      submission.status = 'under_review';
      submission.notes = notes || submission.notes;
      submission.history.push({
        action: 'resubmission',
        status: 'under_review',
        notes: 'Updated verification video uploaded',
        timestamp: new Date(),
        by: req.user._id,
      });
      await submission.save();
    } else {
      submission = await VerificationSubmission.create({
        influencerId: req.user._id,
        videoUrl: uploaded.url,
        publicId: uploaded.publicId,
        mediaType: 'video',
        fileFormat: uploaded.format || 'mp4',
        status: 'under_review',
        notes,
        history: [
          {
            action: 'initial_submission',
            status: 'under_review',
            notes: 'Verification video submitted for review',
            timestamp: new Date(),
            by: req.user._id,
          },
        ],
      });
    }

    // Update user and profile statuses
    await User.findByIdAndUpdate(req.user._id, {
      influencerVerificationStatus: 'under_review',
    });

    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    if (profile) {
      profile.verificationStatus = 'pending';
      if (averageViews > 0) profile.averageViews = averageViews;
      await profile.save();
    }

    // Notify influencer
    await Notification.create({
      userId: req.user._id,
      title: 'Verification Video Received',
      message: 'Your account verification video has been received and is currently under review by our admin team.',
      type: 'info',
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Influencer Verification Submission',
        message: `${req.user.name} submitted a verification video for review.`,
        type: 'info',
        link: '/admin/influencers',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification video submitted successfully! Admin will review your account shortly.',
      submission,
      verificationStatus: 'under_review',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get account verification status & submission
 * @route   GET /api/influencers/verification-status
 * @access  Private (Influencer)
 */
const getVerificationStatus = async (req, res, next) => {
  try {
    const submission = await VerificationSubmission.findOne({ influencerId: req.user._id }).sort({ createdAt: -1 });
    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id).select('influencerVerificationStatus');

    res.status(200).json({
      success: true,
      submission,
      status: user?.influencerVerificationStatus || profile?.verificationStatus || 'pending',
      isVerified: profile?.verificationStatus === 'verified',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit reach proof screenshots (Preserved for compatibility)
 * @route   POST /api/influencers/reach-proof
 * @access  Private (Influencer)
 */
const submitReachProof = async (req, res, next) => {
  try {
    const { averageViews } = req.body;
    const file = req.file || (req.files && req.files[0]);

    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (file) {
      const uploaded = await processUploadedFile(file, 'reach_proofs');
      if (uploaded) {
        profile.proofImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          uploadedAt: new Date(),
        });
      }
    }

    if (averageViews) {
      profile.averageViews = Number(averageViews);
    }
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Reach proof updated.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current influencer's assigned/active/completed gigs
 * @route   GET /api/influencers/gigs
 * @access  Private (Influencer)
 */
const getMyGigs = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { influencerId: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const gigs = await Gig.find(query)
      .populate({
        path: 'campaignId',
        select: 'title description category objective media adCopy callToAction targetCountry targetRegion targetAreas duration startDate endDate instructions price',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: gigs.length, gigs });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific gig details
 * @route   GET /api/influencers/gigs/:id
 * @access  Private (Influencer)
 */
const getGigDetails = async (req, res, next) => {
  try {
    const gig = await Gig.findOne({
      _id: req.params.id,
      influencerId: req.user._id,
    }).populate('campaignId');

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig assignment not found' });
    }

    const submission = await GigSubmission.findOne({ gigId: gig._id });

    res.status(200).json({ success: true, gig, submission });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Accept assigned gig
 * @route   PUT /api/influencers/gigs/:id/accept
 * @access  Private (Influencer)
 */
const acceptGig = async (req, res, next) => {
  try {
    const gig = await Gig.findOne({
      _id: req.params.id,
      influencerId: req.user._id,
    });

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (gig.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept gig in '${gig.status}' status.`,
      });
    }

    gig.status = 'accepted';
    gig.acceptedAt = new Date();
    await gig.save();

    // Record Schedule B Influencer Declaration
    try {
      await TermsAcceptance.create({
        userId: req.user._id,
        role: req.user.role || 'influencer',
        documentIdentifier: 'mediova_terms_and_conditions_of_service',
        declarationType: 'influencer_schedule_b',
        source: 'influencer_gig_declaration',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers ? req.headers['user-agent'] : undefined,
        metadata: {
          gigId: gig._id,
          gigNumber: gig.gigNumber,
          campaignId: gig.campaignId,
        },
      });
    } catch (declErr) {
      console.warn('Influencer Schedule B Declaration audit logging failed:', declErr.message);
    }

    await Notification.create({
      userId: req.user._id,
      title: 'Gig Accepted',
      message: `You accepted gig #${gig.gigNumber}. Post according to instructions and submit video evidence before the deadline.`,
      type: 'gig',
      link: `/influencer/gigs/${gig._id}`,
    });

    res.status(200).json({ success: true, message: 'Gig accepted successfully', gig });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Decline assigned gig
 * @route   PUT /api/influencers/gigs/:id/decline
 * @access  Private (Influencer)
 */
const declineGig = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const gig = await Gig.findOne({
      _id: req.params.id,
      influencerId: req.user._id,
    });

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (gig.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot decline gig in '${gig.status}' status.`,
      });
    }

    gig.status = 'declined';
    gig.declineReason = reason || 'Not available';
    await gig.save();

    // Deduct assigned reach from campaign
    await Campaign.findByIdAndUpdate(gig.campaignId, {
      $inc: { assignedReach: -gig.assignedViews },
    });

    res.status(200).json({ success: true, message: 'Gig declined', gig });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit gig completion video evidence
 * @route   POST /api/influencers/gigs/:id/submit
 * @access  Private (Influencer)
 */
const submitGigProof = async (req, res, next) => {
  try {
    const { reportedViews, notes } = req.body;
    const gig = await Gig.findOne({
      _id: req.params.id,
      influencerId: req.user._id,
    });

    if (!gig) {
      return res.status(404).json({ success: false, message: 'Gig not found' });
    }

    if (!['accepted', 'in_progress', 'rejected', 'submitted'].includes(gig.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit proof for gig with status '${gig.status}'`,
      });
    }

    const file = req.file || (req.files && req.files[0]);
    let videoUrl = '';
    let videoPublicId = '';
    const proofImages = [];

    if (file) {
      const uploaded = await processUploadedFile(file, 'gig_completion_videos');
      if (uploaded) {
        videoUrl = uploaded.url;
        videoPublicId = uploaded.publicId;
        proofImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          type: 'video',
          uploadedAt: new Date(),
        });
      }
    }

    // Upsert submission
    let submission = await GigSubmission.findOne({ gigId: gig._id });
    if (submission) {
      submission.reportedViews = Number(reportedViews) || submission.reportedViews;
      submission.notes = notes || submission.notes;
      if (videoUrl) {
        submission.videoUrl = videoUrl;
        submission.videoPublicId = videoPublicId;
        submission.mediaType = 'video';
      }
      if (proofImages.length > 0) {
        submission.proofImages.push(...proofImages);
      }
      submission.reviewStatus = 'pending';
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await GigSubmission.create({
        gigId: gig._id,
        campaignId: gig.campaignId,
        influencerId: req.user._id,
        videoUrl,
        videoPublicId,
        mediaType: 'video',
        proofImages,
        reportedViews: Number(reportedViews) || 0,
        notes: notes || '',
        reviewStatus: 'pending',
        submittedAt: new Date(),
      });
    }

    gig.status = 'submitted';
    gig.submittedAt = new Date();
    await gig.save();

    await Notification.create({
      userId: req.user._id,
      title: 'Gig Evidence Submitted',
      message: `Your video completion evidence for gig #${gig.gigNumber} has been received and is awaiting Admin review.`,
      type: 'info',
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Gig Evidence Submitted',
        message: `Influencer submitted completion video for Gig #${gig.gigNumber}.`,
        type: 'gig',
        link: `/admin/gigs/${gig._id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gig completion video submitted successfully! Awaiting Admin review.',
      gig,
      submission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get influencer earnings overview & transactions
 * @route   GET /api/influencers/earnings
 * @access  Private (Influencer)
 */
const getMyEarnings = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ influencerId: req.user._id })
      .populate('gigId', 'gigNumber reward')
      .populate('campaignId', 'title')
      .sort({ createdAt: -1 });

    const totalEarned = transactions
      .filter((t) => ['approved', 'paid'].includes(t.status))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const pendingEarnings = transactions
      .filter((t) => t.status === 'pending')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const paidEarnings = transactions
      .filter((t) => t.status === 'paid')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const availableBalance = transactions
      .filter((t) => t.status === 'approved')
      .reduce((acc, curr) => acc + curr.amount, 0);

    res.status(200).json({
      success: true,
      summary: {
        totalEarned,
        pendingEarnings,
        paidEarnings,
        availableBalance,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  updateAvailability,
  updateBankDetails,
  submitVerificationVideo,
  getVerificationStatus,
  submitReachProof,
  getMyGigs,
  getGigDetails,
  acceptGig,
  declineGig,
  submitGigProof,
  getMyEarnings,
};
