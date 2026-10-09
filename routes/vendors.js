const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getMyProfile,
  updateProfile,
  createCampaign,
  getMyCampaigns,
  getCampaignDetails,
  getOrderOptions,
} = require('../controllers/vendorController');

router.use(protect, authorize('vendor'));

router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);
router.get('/order-options', getOrderOptions);
router.post('/campaigns', upload.single('media'), createCampaign);
router.get('/campaigns', getMyCampaigns);
router.get('/campaigns/:id', getCampaignDetails);

module.exports = router;
