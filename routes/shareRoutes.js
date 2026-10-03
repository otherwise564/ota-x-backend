const express = require('express');

const router = express.Router();

const {
  sharePost,
  getShareCount
} = require('../controllers/shareController');

const authMiddleware = require('../middleware/auth');

// =====================================================
// SHARE ROUTES
// =====================================================

// Share a post
// Requires authentication
router.post(
  '/:postId',
  authMiddleware,
  sharePost
);

// Get the share count for a post
// Public endpoint
router.get(
  '/:postId/count',
  getShareCount
);

module.exports = router;
