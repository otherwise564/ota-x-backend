const express = require('express');

const router = express.Router();

const {
  favoritePost,
  unfavoritePost,
  getMyFavorites,
  getFavoriteStatus
} = require('../controllers/favoriteController');

const authMiddleware = require('../middleware/auth');

// Save a post
router.post('/:postId', authMiddleware, favoritePost);

// Remove a post from saved
router.delete('/:postId', authMiddleware, unfavoritePost);

// Get the logged-in user's saved posts
router.get('/me', authMiddleware, getMyFavorites);

// Check whether the logged-in user saved a post
router.get(
  '/:postId/status',
  authMiddleware,
  getFavoriteStatus
);

module.exports = router;
