// ============================================================
// ADMIN ROUTES — Platform management + Settings
// ============================================================
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// Campaign vetting
router.get('/campaigns/pending', adminController.getPendingCampaigns);
router.put('/campaigns/:id/approve', adminController.approveCampaign);
router.put('/campaigns/:id/reject', adminController.rejectCampaign);

// Donations
router.get('/donations', adminController.getAllDonations);

// Withdrawal management
router.get('/withdrawals', adminController.getPendingWithdrawals);
router.put('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', adminController.rejectWithdrawal);

// Platform metrics
router.get('/stats', adminController.getPlatformStats);

// Platform settings (dynamic Stripe key management)
router.get('/settings', adminController.getSettings);
router.get('/settings/stripe-status', adminController.getStripeStatus);
router.post('/settings/test-email', adminController.testEmail);
router.put('/settings/:key', adminController.updateSetting);

module.exports = router;
