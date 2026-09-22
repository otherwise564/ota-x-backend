const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Default route
app.get('/', (req, res) => {
  res.json({ message: "OTA X Backend is live and running!" });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
        
