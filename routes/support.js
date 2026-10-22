const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  submitSupportTicket,
  getMyTickets,
} = require('../controllers/supportController');

// Optional protect middleware helper so submit can work for both guest and authenticated users
const optionalProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();

  try {
    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
  } catch {
    // Continue as guest if token invalid
  }
  next();
};

router.post('/tickets', optionalProtect, submitSupportTicket);
router.get('/my-tickets', protect, getMyTickets);

module.exports = router;
