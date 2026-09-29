const express = require('express');

const router = express.Router();

const {
  createComment,
  getPostComments
} = require('../controllers/commentController');

const authMiddleware = require('../middleware/auth');

// Get comments for a post
router.get('/:postId', getPostComments);

// Create a comment or reply
router.post('/:postId', authMiddleware, createComment);

module.exports = router;
