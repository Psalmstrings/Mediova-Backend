const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllInfluencers,
  getInfluencerById,
  verifyInfluencer,
  getVerificationSubmissions,
  reviewVerificationSubmission,
  updateInfluencerAvailability,
  getAllVendors,
  getVendorById,
  getAllCampaigns,
  getCampaignById,
  updateCampaignStatus,
  verifyCampaignPayment,
  submitCompletedWork,
  getAllPayments,
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
  getAllRefunds,
  updateRefundStatus,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  getAllSupportTickets,
  updateSupportTicket,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

// SMTP Test Email (Admin-only)
router.post('/test-email', testEmailService);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);

// Influencer Verification Queue
router.get('/verifications', getVerificationSubmissions);
router.patch('/verifications/:id/review', reviewVerificationSubmission);

// Influencers
router.get('/influencers', getAllInfluencers);
router.get('/influencers/match', matchInfluencers);
router.get('/influencers/:id', getInfluencerById);
router.patch('/influencers/:id/verify', verifyInfluencer);
router.patch('/influencers/:id/availability', updateInfluencerAvailability);

// Vendors
router.get('/vendors', getAllVendors);
router.get('/vendors/:id', getVendorById);

// Campaigns & Payment Review
router.get('/campaigns', getAllCampaigns);
router.get('/campaigns/:id', getCampaignById);
router.patch('/campaigns/:id/status', updateCampaignStatus);
router.patch('/campaigns/:id/verify-payment', verifyCampaignPayment);
router.post('/campaigns/:id/submit-completed-work', upload.array('evidence', 5), submitCompletedWork);

// Payments & Receipts
router.get('/payments', getAllPayments);

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

// Settings (Targeting limits, payment instructions, etc.)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Refunds Management
router.get('/refunds', getAllRefunds);
router.patch('/refunds/:id', updateRefundStatus);

// Complaints Management
router.get('/complaints', getAllComplaints);
router.get('/complaints/:id', getComplaintById);
router.patch('/complaints/:id', updateComplaint);

// Support Tickets Management
router.get('/support-tickets', getAllSupportTickets);
router.patch('/support-tickets/:id', updateSupportTicket);

module.exports = router;
