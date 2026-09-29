const express = require('express');

const router = express.Router();

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStatus
} = require('../controllers/followController');

const authMiddleware = require('../middleware/auth');

// Follow a user
router.post('/:userId', authMiddleware, followUser);

// Unfollow a user
router.delete('/:userId', authMiddleware, unfollowUser);

// Get a user's followers
router.get('/:userId/followers', getFollowers);

// Get users a user is following
router.get('/:userId/following', getFollowing);

// Get follow status and counts
router.get(
  '/:userId/status',
  authMiddleware,
  getFollowStatus
);

module.exports = router;
