const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/me', userController.getMe);
router.post('/kyc', userController.submitKyc);
router.post('/kyc/stripe-session', userController.createStripeKycSession);
router.get('/kyc/stripe-sync', userController.syncStripeKycSession);

// Stripe Connect
router.post('/stripe/connect', userController.createStripeConnectAccount);
router.get('/stripe/status', userController.getStripeConnectStatus);

module.exports = router;
