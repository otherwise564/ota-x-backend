const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const authMiddleware = require('../middleware/auth');

// Public status route
router.get('/status', apiController.getStatus);

// Protected route (requires valid JWT token)
router.get('/profile', authMiddleware, apiController.getProfile);

module.exports = router;
