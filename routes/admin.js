const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllInfluencers,
  getInfluencerById,
  verifyInfluencer,
  updateInfluencerAvailability,
  getAllVendors,
  getVendorById,
  getAllCampaigns,
  getCampaignById,
  updateCampaignStatus,
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
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

// SMTP Test Email (Admin-only)
router.post('/test-email', testEmailService);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);

// Influencers
router.get('/influencers', getAllInfluencers);
router.get('/influencers/match', matchInfluencers);
router.get('/influencers/:id', getInfluencerById);
router.patch('/influencers/:id/verify', verifyInfluencer);
router.patch('/influencers/:id/availability', updateInfluencerAvailability);

// Vendors
router.get('/vendors', getAllVendors);
router.get('/vendors/:id', getVendorById);

// Campaigns
router.get('/campaigns', getAllCampaigns);
router.get('/campaigns/:id', getCampaignById);
router.patch('/campaigns/:id/status', updateCampaignStatus);

// Gigs
router.get('/gigs', getAllGigs);
router.get('/gigs/:id', getGigById);
router.post('/gigs/assign', assignGigs);
router.post('/gigs/review', reviewGigSubmission);
router.get('/gigs/submissions', getAllGigSubmissions);

// Transactions / Earnings
router.get('/transactions', getAllTransactions);
router.patch('/transactions/:id/pay', markTransactionPaid);

// Categories
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Reach Packages
router.get('/packages', getPackages);
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);

// Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;
