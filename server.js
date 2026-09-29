const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/postRoutes');
const likeRoutes = require('./routes/likeRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const followRoutes = require('./routes/followRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');

const app = express();
const PORT = process.env.PORT || 10000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// ROOT
// =====================================================

app.get('/', (req, res) => {
  res.json({
    message: 'OTA X Backend is live and running!'
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date()
  });
});

// =====================================================
// API ROUTES
// =====================================================

app.use('/api', apiRoutes);

// =====================================================
// AUTHENTICATION
// =====================================================

app.use('/api/auth', authRoutes);

// =====================================================
// POSTS
// =====================================================

app.use('/api/posts', postRoutes);

// =====================================================
// LIKES
// =====================================================

app.use('/api/likes', likeRoutes);

// =====================================================
// COMMENTS
// =====================================================

app.use('/api/comments', commentRoutes);

// =====================================================
// NOTIFICATIONS
// =====================================================

app.use('/api/notifications', notificationRoutes);

// =====================================================
// FOLLOWS
// =====================================================

app.use('/api/follows', followRoutes);

// =====================================================
// FAVORITES / SAVED POSTS
// =====================================================

app.use('/api/favorites', favoriteRoutes);

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(
    `OTA X Backend running on port ${PORT}`
  );
});
