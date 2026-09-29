const prisma = require('../config/db');

// =====================================================
// API STATUS
// =====================================================

exports.getStatus = (req, res) => {
  res.json({
    app: 'OTA X Backend',
    environment: process.env.NODE_ENV || 'production',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date()
  });
};


// =====================================================
// GET MY PROFILE
// =====================================================

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isCreatorVerified: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User profile not found.'
      });
    }

    return res.status(200).json({
      profile: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isCreatorVerified: user.isCreatorVerified,
        isVerified: user.isVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        counts: {
          posts: user._count.posts,
          followers: user._count.followers,
          following: user._count.following
        }
      }
    });

  } catch (error) {
    console.error(
      'GET PROFILE ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error while getting profile.'
    });
  }
};
