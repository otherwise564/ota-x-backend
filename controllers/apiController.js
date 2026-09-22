// Controller functions for API endpoints

exports.getStatus = (req, res) => {
  res.json({
    app: "OTA X Backend",
    environment: process.env.NODE_ENV || "production",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date()
  });
};

exports.getProfile = (req, res) => {
  res.json({
    brand: "OTA X",
    status: "Active",
    message: "Controller logic executing cleanly."
  });
};
    
