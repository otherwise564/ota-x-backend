const prisma = require('../config/db');

// =====================================================
// ALLOWED SETTINGS
// =====================================================

const allowedSettings = [
  'darkMode',
  'notifications',

  'notifyLikes',
  'notifyComments',
  'notifyFollowers',
  'notifyMessages',
  'notifyMentions',
  'notifyReposts',
  'notifyFavorites',
  'notifySystem',

  'privateAccount',
  'showActivityStatus',

  'allowComments',

  'allowMessages',
  'allowMessageRequests',
  'showReadStatus',

  'autoplayVideos',
  'dataSaver',

  'suggestMyAccount',
  'allowMentions',
  'allowTags',

  'loginAlerts'
];


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

    // Create default settings automatically
    // for users who do not have a settings record yet.
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

    const data = {};

    // Only accept known settings.
    for (const setting of allowedSettings) {
      if (req.body[setting] !== undefined) {

        if (typeof req.body[setting] !== 'boolean') {
          return res.status(400).json({
            error: `${setting} must be true or false.`
          });
        }

        data[setting] = req.body[setting];
      }
    }

    // -----------------------------
    // UNKNOWN / EMPTY REQUEST
    // -----------------------------

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: 'No valid settings were provided.'
      });
    }

    // -----------------------------
    // UPDATE DATABASE
    // -----------------------------

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

          notifyLikes: true,
          notifyComments: true,
          notifyFollowers: true,
          notifyMessages: true,
          notifyMentions: true,
          notifyReposts: true,
          notifyFavorites: true,
          notifySystem: true,

          privateAccount: false,
          showActivityStatus: true,

          allowComments: true,

          allowMessages: true,
          allowMessageRequests: true,
          showReadStatus: true,

          autoplayVideos: true,
          dataSaver: false,

          suggestMyAccount: true,
          allowMentions: true,
          allowTags: true,

          loginAlerts: true
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
