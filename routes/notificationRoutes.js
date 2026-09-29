const express = require('express');

const router = express.Router();

const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../controllers/notificationController');

const authMiddleware = require('../middleware/auth');

// Get the logged-in user's notifications
router.get('/', authMiddleware, getMyNotifications);

// Mark one notification as read
router.patch(
  '/:notificationId/read',
  authMiddleware,
  markNotificationAsRead
);

// Mark all notifications as read
router.patch(
  '/read-all',
  authMiddleware,
  markAllNotificationsAsRead
);

module.exports = router;
