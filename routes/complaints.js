const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  submitComplaint,
  getMyComplaints,
  getComplaintDetails,
} = require('../controllers/complaintController');

router.use(protect);

router.post('/', submitComplaint);
router.get('/my', getMyComplaints);
router.get('/:id', getComplaintDetails);

module.exports = router;
