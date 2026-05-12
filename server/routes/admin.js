// ============================================================
// ADMIN ROUTES — Platform management + Settings
// ============================================================
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// User Management
router.get('/users', adminController.getAllUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Campaign vetting
router.get('/campaigns/pending', adminController.getPendingCampaigns);
router.get('/campaigns', adminController.getAllCampaigns);
router.put('/campaigns/:id/approve', adminController.approveCampaign);
router.put('/campaigns/:id/reject', adminController.rejectCampaign);
router.delete('/campaigns/:id', adminController.deleteCampaign);

// Donations
router.get('/donations', adminController.getAllDonations);

// Withdrawal management
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.put('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', adminController.rejectWithdrawal);

// Platform stats
router.get('/stats', adminController.getPlatformStats);

// KYC
router.get('/kyc/all', adminController.getAllKyc);
router.put('/kyc/:id/approve', adminController.approveKyc);
router.put('/kyc/:id/reject', adminController.rejectKyc);

// Platform settings (dynamic Stripe key management)
router.get('/settings', adminController.getSettings);
router.get('/settings/stripe-status', adminController.getStripeStatus);
router.post('/settings/test-email', adminController.testEmail);
router.put('/settings/:key', adminController.updateSetting);

module.exports = router;
