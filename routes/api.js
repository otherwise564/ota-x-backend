const express = require('express');
const router = express.Router();

// General status / metadata endpoint
router.get('/status', (req, res) => {
  res.json({
    app: "OTA X Backend",
    environment: "production",
    version: "1.0.0",
    uptime: process.uptime()
  });
});

// Example placeholder route for profile/brand data
router.get('/profile', (req, res) => {
  res.json({
    brand: "OTA X",
    status: "Active",
    message: "Core routes initialized successfully."
  });
});

module.exports = router;

