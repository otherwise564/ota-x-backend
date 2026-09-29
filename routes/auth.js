const express = require('express');

const router = express.Router();

const {
  register,
  login,
  verifyCode,
  resendVerificationCode
} = require('../controllers/authController');

// Register a new OTA X account
router.post('/register', register);

// Login to a verified OTA X account
router.post('/login', login);

// Verify email verification code
router.post('/verify-code', verifyCode);

// Request a new verification code
router.post('/resend-verification', resendVerificationCode);

module.exports = router;
