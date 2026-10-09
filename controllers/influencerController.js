const InfluencerProfile = require('../models/InfluencerProfile');
const User = require('../models/User');
const Gig = require('../models/Gig');
const GigSubmission = require('../models/GigSubmission');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Campaign = require('../models/Campaign');
const { processUploadedFile } = require('../middleware/upload');

/**
 * @desc    Get current influencer's full profile
 * @route   GET /api/influencers/profile
 * @access  Private (Influencer)
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await InfluencerProfile.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone profileImage'
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Influencer profile not found' });
    }

    res.status(200).json({ success: true, profile });
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
      phone,
      whatsappNumber,
      state,
      city,
      lga,
      area,
      additionalAreas,
      categories,
    } = req.body;

    // Update user record
    if (name || phone) {
      await User.findByIdAndUpdate(req.user._id, {
        ...(name && { name }),
        ...(phone && { phone }),
      });
    }

    const profile = await InfluencerProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        ...(whatsappNumber && { whatsappNumber }),
        ...(state && { state }),
        ...(city !== undefined && { city }),
        ...(lga !== undefined && { lga }),
        ...(area && { area }),
        ...(additionalAreas && { additionalAreas }),
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
    const { accountName, bankName, accountNumber } = req.body;

    if (!accountName || !bankName || !accountNumber) {
      return res.status(400).json({
        success: false,
        message: 'Account Name, Bank Name, and Account Number are all required.',
      });
    }

    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    profile.bankDetails = {
      accountName,
      bankName,
      accountNumber,
    };
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Bank details saved securely',
      bankDetails: profile.bankDetails,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit reach proof screenshots
 * @route   POST /api/influencers/reach-proof
 * @access  Private (Influencer)
 */
const submitReachProof = async (req, res, next) => {
  try {
    const { averageViews } = req.body;
    const files = req.files || (req.file ? [req.file] : []);

    const profile = await InfluencerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    const uploadedProofImages = [];
    for (const f of files) {
      const uploaded = await processUploadedFile(f, 'reach_proofs');
      if (uploaded) {
        uploadedProofImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          uploadedAt: new Date(),
        });
      }
    }

    if (averageViews) {
      profile.averageViews = Number(averageViews);
    }
    if (uploadedProofImages.length > 0) {
      profile.proofImages.push(...uploadedProofImages);
    }
    profile.verificationStatus = 'pending';
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Reach proof submitted. Admin broker will verify your metrics shortly.',
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
        select: 'title description category objective media adCopy callToAction targetLocation duration startDate endDate instructions',
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

    await Notification.create({
      userId: req.user._id,
      title: 'Gig Accepted',
      message: `You accepted gig #${gig.gigNumber}. Please post according to instructions and submit proof before deadline.`,
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
 * @desc    Submit gig proof (Status post + views screenshot)
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

    if (!['accepted', 'in_progress', 'rejected'].includes(gig.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit proof for gig with status '${gig.status}'`,
      });
    }

    const files = req.files || (req.file ? [req.file] : []);
    const proofImages = [];

    for (const f of files) {
      const uploaded = await processUploadedFile(f, 'gig_proofs');
      if (uploaded) {
        proofImages.push({
          url: uploaded.url,
          publicId: uploaded.publicId,
          type: 'status_post',
          uploadedAt: new Date(),
        });
      }
    }

    // Upsert submission
    let submission = await GigSubmission.findOne({ gigId: gig._id });
    if (submission) {
      submission.reportedViews = Number(reportedViews) || submission.reportedViews;
      submission.notes = notes || submission.notes;
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
      title: 'Proof Submitted',
      message: `Your proof for gig #${gig.gigNumber} has been received and is awaiting Admin review.`,
      type: 'info',
    });

    res.status(200).json({
      success: true,
      message: 'Gig proof submitted successfully! Awaiting Admin Broker review.',
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
  submitReachProof,
  getMyGigs,
  getGigDetails,
  acceptGig,
  declineGig,
  submitGigProof,
  getMyEarnings,
};
