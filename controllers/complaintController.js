const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * @desc    Submit a formal complaint or appeal
 * @route   POST /api/complaints
 * @access  Private (Vendor or Influencer)
 */
const submitComplaint = async (req, res, next) => {
  try {
    const { category, referenceNumber, subject, description, preferredContact } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, subject, and detailed description are required.',
      });
    }

    const complaintNumber = `CMP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const complaint = await Complaint.create({
      complaintNumber,
      userId: req.user._id,
      userRole: req.user.role,
      category,
      referenceNumber: referenceNumber ? String(referenceNumber).trim() : '',
      subject: subject.trim(),
      description: description.trim(),
      preferredContact: preferredContact || 'email',
      status: 'Open',
    });

    // In-app acknowledgment to user
    await Notification.create({
      userId: req.user._id,
      title: 'Complaint Logged Successfully',
      message: `Your complaint #${complaintNumber} ("${subject}") has been logged. Our disputes team will investigate and respond within 24-48 business hours.`,
      type: 'info',
    });

    // Notify all admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Complaint Received',
        message: `Complaint #${complaintNumber} [${category}] submitted by ${req.user.name} (${req.user.role}): "${subject}".`,
        type: 'campaign',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully. An investigation reference has been generated.',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all complaints submitted by the authenticated user
 * @route   GET /api/complaints/my
 * @access  Private
 */
const getMyComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ userId: req.user._id })
      .select('-internalInvestigationNotes') // Complainants cannot see internal investigation notes
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single complaint details with ownership check
 * @route   GET /api/complaints/:id
 * @access  Private
 */
const getComplaintDetails = async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select('-internalInvestigationNotes');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint record not found.' });
    }

    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitComplaint,
  getMyComplaints,
  getComplaintDetails,
};
