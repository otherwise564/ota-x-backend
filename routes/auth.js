const express = require('express');

const router = express.Router();

const {
  register,
  login,
  verifyCode
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-code', verifyCode);

module.exports = router;
