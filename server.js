const express = require('express');
const cors = require('cors');
require('dotenv').config();

// =====================================================
// ROUTES
// =====================================================

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/postRoutes');
const likeRoutes = require('./routes/likeRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const followRoutes = require('./routes/followRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const shareRoutes = require('./routes/shareRoutes');
const repostRoutes = require('./routes/repostRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// =====================================================
// APP
// =====================================================

const app = express();
const PORT = Number(process.env.PORT) || 10000;

// Render / reverse-proxy support
app.set('trust proxy', 1);

// =====================================================
// CORS
// =====================================================

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests and tools such as ReqBin.
      if (!origin) {
        return callback(null, true);
      }

      // If FRONTEND_URL has not been configured yet,
      // allow the request so deployment is not accidentally
      // broken during setup.
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error('CORS origin not allowed.')
      );
    },
    credentials: true
  })
);

// =====================================================
// BODY PARSING
// =====================================================

app.use(
  express.json({
    limit: '2mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb'
  })
);

// =====================================================
// ROOT
// =====================================================

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'OTA X Backend is live and running!'
  });
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString()
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
// SHARES
// =====================================================

app.use('/api/shares', shareRoutes);

// =====================================================
// REPOSTS
// =====================================================

app.use('/api/reposts', repostRoutes);

// =====================================================
// SETTINGS
// =====================================================

app.use('/api/settings', settingsRoutes);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.',
    path: req.originalUrl
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error('GLOBAL SERVER ERROR:', err);

  if (err.message === 'CORS origin not allowed.') {
    return res.status(403).json({
      error: 'Origin not allowed.'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body is too large.'
    });
  }

  return res.status(500).json({
    error: 'Internal server error.'
  });
});

// =====================================================
// START SERVER
// =====================================================

const server = app.listen(PORT, () => {
  console.log(
    `OTA X Backend running on port ${PORT}`
  );
});

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

const shutdown = signal => {
  console.log(`Received ${signal}. Shutting down OTA X Backend...`);

  server.close(() => {
    console.log('OTA X Backend stopped.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error(
      'Forced shutdown after timeout.'
    );
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
