const express = require('express');
const router = express.Router();

const apiController = require('../controllers/apiController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// =====================================================
// PUBLIC STATUS
// =====================================================

router.get(
  '/status',
  apiController.getStatus
);

// =====================================================
// CURRENT USER PROFILE
// =====================================================

router.get(
  '/profile',
  authMiddleware,
  apiController.getProfile
);

// =====================================================
// UPDATE CURRENT USER PROFILE
// =====================================================

router.patch(
  '/profile',
  authMiddleware,
  apiController.updateProfile
);

// =====================================================
// OTHER USER PUBLIC PROFILE
// =====================================================

router.get(
  '/profile/:userId',
  authMiddleware,
  apiController.getPublicProfile
);

// =====================================================
// ADMIN DASHBOARD
// =====================================================

router.get(
  '/admin/dashboard',
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    res.json({
      message: 'Welcome to the Admin Dashboard!',
      user: req.user
    });
  }
);

module.exports = router;
