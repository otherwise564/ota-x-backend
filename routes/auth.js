const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const supabaseAuthController = require('../controllers/supabaseAuthController');

router.get('/check-username', authController.checkUsernameAvailability);
router.post('/register', supabaseAuthController.register);
router.post('/login', supabaseAuthController.login);
router.post('/verify-code', authController.verifyCode);
router.post('/resend-verification', authController.resendVerificationCode);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
