const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const limits = require('../controllers/limitController');

router.post('/guest/session', limits.startGuestSession);
router.get('/guest/status', limits.getGuestStatus);
router.post('/guest/views/:postId', limits.recordGuestView);

router.get('/offline/status', authMiddleware, limits.getOfflineStatus);
router.post('/offline/:postId', authMiddleware, limits.registerOfflineDownload);

module.exports = router;
