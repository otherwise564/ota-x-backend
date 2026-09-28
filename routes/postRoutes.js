const express = require('express');
const router = express.Router();
const { createPost, getAllPosts } = require('../controllers/postController');
const authMiddleware = require('../middleware/auth');

// Route to get all posts (public feed)
router.get('/', getAllPosts);

// Route to create a new post (requires user to be logged in with token)
router.post('/', authMiddleware, createPost);

module.exports = router;
