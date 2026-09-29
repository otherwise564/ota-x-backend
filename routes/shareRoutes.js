const express = require('express');

const router = express.Router();

const {
  sharePost,
  getShareCount
} = require('../controllers/shareController');

const authMiddleware = require('../middleware/auth');

// Share a post
router.post('/:postId', authMiddleware, sharePost);

// Get share count for a post
router.get('/:postId/count', getShareCount);

module.exports = router;
