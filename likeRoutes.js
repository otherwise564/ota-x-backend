const express = require('express');
const router = express.Router();

const {
  likePost,
  unlikePost
} = require('../controllers/likeController');

const authMiddleware = require('../middleware/auth');

router.post('/:postId', authMiddleware, likePost);

router.delete('/:postId', authMiddleware, unlikePost);

module.exports = router;
