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
// GET MY REPOSTS
// =====================================================

router.get(
  '/me',
  authMiddleware,
  getMyReposts
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
