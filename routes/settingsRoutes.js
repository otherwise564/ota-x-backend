const express = require('express');

const router = express.Router();

const {
  getMySettings,
  updateMySettings,
  resetMySettings
} = require('../controllers/settingsController');

const authMiddleware = require('../middleware/auth');

// =====================================================
// GET MY SETTINGS
// =====================================================

router.get(
  '/',
  authMiddleware,
  getMySettings
);

// =====================================================
// UPDATE MY SETTINGS
// =====================================================

router.patch(
  '/',
  authMiddleware,
  updateMySettings
);

// =====================================================
// RESET MY SETTINGS
// =====================================================

router.post(
  '/reset',
  authMiddleware,
  resetMySettings
);

module.exports = router;
