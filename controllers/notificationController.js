const prisma = require('../config/db');

// =====================================================
// GET MY NOTIFICATIONS
// =====================================================

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications =
      await prisma.notification.findMany({
        where: {
          recipientId: userId
        },

        orderBy: {
          createdAt: 'desc'
        },

        take: 50,

        include: {
          actor: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              isCreatorVerified: true
            }
          }
        }
      });

    const unreadCount =
      await prisma.notification.count({
        where: {
          recipientId: userId,
          isRead: false
        }
      });

    return res.status(200).json({
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error(
      'GET NOTIFICATIONS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching notifications.'
    });
  }
};


// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId =
      Number(req.params.notificationId);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid notification ID.'
      });
    }

    const notification =
      await prisma.notification.findFirst({
        where: {
          id: notificationId,
          recipientId: userId
        }
      });

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found.'
      });
    }

    const updatedNotification =
      await prisma.notification.update({
        where: {
          id: notificationId
        },

        data: {
          isRead: true
        }
      });

    return res.status(200).json({
      message:
        'Notification marked as read.',
      notification: updatedNotification
    });

  } catch (error) {
    console.error(
      'MARK NOTIFICATION ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while updating notification.'
    });
  }
};


// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false
      },

      data: {
        isRead: true
      }
    });

    return res.status(200).json({
      message:
        'All notifications marked as read.'
    });

  } catch (error) {
    console.error(
      'MARK ALL NOTIFICATIONS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while updating notifications.'
    });
  }
};
