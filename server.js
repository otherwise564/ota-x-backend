const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/postRoutes');
const likeRoutes = require('./routes/likeRoutes');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OTA X Backend is live and running!'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date()
  });
});

// API routes
app.use('/api', apiRoutes);

// Authentication
app.use('/api/auth', authRoutes);

// Posts
app.use('/api/posts', postRoutes);

// Likes / Unlikes
app.use('/api/likes', likeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
