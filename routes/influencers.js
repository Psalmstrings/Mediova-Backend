const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
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
} = require('../controllers/influencerController');

router.use(protect, authorize('influencer'));

router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);
router.patch('/availability', updateAvailability);
router.put('/bank-details', updateBankDetails);
router.post('/reach-proof', upload.array('proofImages', 5), submitReachProof);
router.get('/gigs', getMyGigs);
router.get('/gigs/:id', getGigDetails);
router.put('/gigs/:id/accept', acceptGig);
router.put('/gigs/:id/decline', declineGig);
router.post('/gigs/:id/submit', upload.array('proofImages', 5), submitGigProof);
router.get('/earnings', getMyEarnings);

module.exports = router;
