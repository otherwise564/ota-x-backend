const prisma = require('../config/db');

// =====================================================
// GET MY SETTINGS
// =====================================================

exports.getMySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await prisma.userSettings.findUnique({
      where: {
        userId
      }
    });

    // Create default settings if the user does not
    // have a settings record yet.
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId
        }
      });
    }

    return res.status(200).json({
      settings
    });

  } catch (error) {
    console.error(
      'GET SETTINGS ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error while getting settings.'
    });
  }
};


// =====================================================
// UPDATE MY SETTINGS
// =====================================================

exports.updateMySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      darkMode,
      notifications,
      privateAccount,
      allowMessages,
      allowComments
    } = req.body;

    const data = {};

    // -----------------------------
    // DARK MODE
    // -----------------------------

    if (darkMode !== undefined) {
      if (typeof darkMode !== 'boolean') {
        return res.status(400).json({
          error: 'darkMode must be true or false.'
        });
      }

      data.darkMode = darkMode;
    }

    // -----------------------------
    // NOTIFICATIONS
    // -----------------------------

    if (notifications !== undefined) {
      if (typeof notifications !== 'boolean') {
        return res.status(400).json({
          error:
            'notifications must be true or false.'
        });
      }

      data.notifications = notifications;
    }

    // -----------------------------
    // PRIVATE ACCOUNT
    // -----------------------------

    if (privateAccount !== undefined) {
      if (typeof privateAccount !== 'boolean') {
        return res.status(400).json({
          error:
            'privateAccount must be true or false.'
        });
      }

      data.privateAccount = privateAccount;
    }

    // -----------------------------
    // ALLOW MESSAGES
    // -----------------------------

    if (allowMessages !== undefined) {
      if (typeof allowMessages !== 'boolean') {
        return res.status(400).json({
          error:
            'allowMessages must be true or false.'
        });
      }

      data.allowMessages = allowMessages;
    }

    // -----------------------------
    // ALLOW COMMENTS
    // -----------------------------

    if (allowComments !== undefined) {
      if (typeof allowComments !== 'boolean') {
        return res.status(400).json({
          error:
            'allowComments must be true or false.'
        });
      }

      data.allowComments = allowComments;
    }

    // -----------------------------
    // NOTHING TO UPDATE
    // -----------------------------

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: 'No valid settings were provided.'
      });
    }

    const settings =
      await prisma.userSettings.upsert({
        where: {
          userId
        },

        create: {
          userId,
          ...data
        },

        update: data
      });

    return res.status(200).json({
      message: 'Settings updated successfully.',
      settings
    });

  } catch (error) {
    console.error(
      'UPDATE SETTINGS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while updating settings.'
    });
  }
};


// =====================================================
// RESET SETTINGS
// =====================================================

exports.resetMySettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings =
      await prisma.userSettings.upsert({
        where: {
          userId
        },

        create: {
          userId
        },

        update: {
          darkMode: true,
          notifications: true,
          privateAccount: false,
          allowMessages: true,
          allowComments: true
        }
      });

    return res.status(200).json({
      message: 'Settings reset successfully.',
      settings
    });

  } catch (error) {
    console.error(
      'RESET SETTINGS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while resetting settings.'
    });
  }
};
