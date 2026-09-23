const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Public status route
router.get('/status', apiController.getStatus);

// Protected route for authenticated users
router.get('/profile', authMiddleware, apiController.getProfile);

// Admin-only route (requires valid JWT AND ADMIN role)
router.get('/admin/dashboard', authMiddleware, adminMiddleware, (req, res) => {
  res.json({ message: "Welcome to the Admin Dashboard!", user: req.user });
});

module.exports = router;
