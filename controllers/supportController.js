const SupportTicket = require('../models/SupportTicket');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * @desc    Submit a support inquiry or request
 * @route   POST /api/support/tickets
 * @access  Public (Optional Auth)
 */
const submitSupportTicket = async (req, res, next) => {
  try {
    const { name, email, category, subject, message, referenceNumber } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required fields.',
      });
    }

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const ticket = await SupportTicket.create({
      ticketNumber,
      userId: req.user ? req.user._id : null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      category: category || 'General Inquiry',
      subject: subject.trim(),
      message: message.trim(),
      referenceNumber: referenceNumber ? String(referenceNumber).trim() : '',
      status: 'Open',
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id,
        title: 'New Support Request',
        message: `Support ticket #${ticketNumber} from ${name} (${email}): "${subject}".`,
        type: 'info',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully. A ticket reference has been created.',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get support tickets for logged-in user
 * @route   GET /api/support/my-tickets
 * @access  Private
 */
const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({
      $or: [{ userId: req.user._id }, { email: req.user.email }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tickets.length,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitSupportTicket,
  getMyTickets,
};
