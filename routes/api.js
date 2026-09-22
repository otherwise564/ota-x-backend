const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Map endpoints directly to controller functions
router.get('/status', apiController.getStatus);
router.get('/profile', apiController.getProfile);

module.exports = router;
