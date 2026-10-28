const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getMyProfile,
  updateProfile,
  createCampaign,
  submitPaymentReceipt,
  reviewCompletedWork,
  getMyCampaigns,
  getCampaignDetails,
  getOrderOptions,
  submitRefundRequest,
  getMyRefundRequests,
} = require('../controllers/vendorController');

router.use(protect, authorize('vendor'));

router.get('/profile', getMyProfile);
router.put('/profile', updateProfile);
router.get('/order-options', getOrderOptions);

// Campaign creation supporting multiple advert media images and payment receipt upload
router.post(
  '/campaigns',
  upload.fields([
    { name: 'media', maxCount: 10 },
    { name: 'mediaFiles', maxCount: 10 },
    { name: 'receipt', maxCount: 1 },
    { name: 'receiptFile', maxCount: 1 },
  ]),
  createCampaign
);

router.get('/campaigns', getMyCampaigns);
router.get('/campaigns/:id', getCampaignDetails);
router.post('/campaigns/:id/receipt', upload.single('receipt'), submitPaymentReceipt);
router.put('/campaigns/:id/review-work', reviewCompletedWork);

// Refunds
router.post('/refunds', submitRefundRequest);
router.get('/refunds', getMyRefundRequests);

module.exports = router;
