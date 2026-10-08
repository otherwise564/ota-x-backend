const express = require('express');

const router = express.Router();

const {
  repostPost,
  unrepostPost,
  getRepostStatus,
  getMyReposts
} = require('../controllers/repostController');

const authMiddleware = require('../middleware/auth');

// =====================================================
// GET MY REPOSTS
// =====================================================
// Must come before /:postId routes so "me" is not
// interpreted as a post ID.

router.get(
  '/me',
  authMiddleware,
  getMyReposts
);

// =====================================================
// REPOST A POST
// =====================================================

router.post(
  '/:postId',
  authMiddleware,
  repostPost
);

// =====================================================
// REMOVE REPOST
// =====================================================

router.delete(
  '/:postId',
  authMiddleware,
  unrepostPost
);

// =====================================================
// GET REPOST STATUS
// =====================================================

router.get(
  '/:postId/status',
  authMiddleware,
  getRepostStatus
);

module.exports = router;
