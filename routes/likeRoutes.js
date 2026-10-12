const express = require('express');
const router = express.Router();

const {
  likePost,
  unlikePost,
  getLikeStatus
} = require('../controllers/likeController');

const authMiddleware = require('../middleware/auth');

router.get('/:postId/status', authMiddleware, getLikeStatus);

router.post('/:postId', authMiddleware, likePost);

router.delete('/:postId', authMiddleware, unlikePost);

module.exports = router;
