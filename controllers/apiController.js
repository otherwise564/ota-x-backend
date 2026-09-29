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

// =====================================================
// GET PUBLIC PROFILE
// =====================================================

exports.getPublicProfile = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

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
        createdAt: true,

        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        },

        posts: {
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            caption: true,
            mediaUrl: true,
            thumbnailUrl: true,
            mediaType: true,
            durationSeconds: true,
            song: true,
            soundUrl: true,
            hashtags: true,
            mentions: true,
            createdAt: true,

            _count: {
              select: {
                likes: true,
                comments: true,
                favorites: true,
                shares: true,
                reposts: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User profile not found.'
      });
    }

    let isFollowing = false;

    if (req.user) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: userId
          }
        }
      });

      isFollowing = Boolean(follow);
    }

    return res.status(200).json({
      profile: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isCreatorVerified: user.isCreatorVerified,
        createdAt: user.createdAt,

        counts: {
          posts: user._count.posts,
          followers: user._count.followers,
          following: user._count.following
        },

        isFollowing,

        posts: user.posts
      }
    });

  } catch (error) {
    console.error(
      'GET PUBLIC PROFILE ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error while getting public profile.'
    });
  }
};

// =====================================================
// UPDATE MY PROFILE
// =====================================================

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      username,
      bio,
      avatarUrl
    } = req.body;

    const data = {};

    // -----------------------------
    // USERNAME
    // -----------------------------

    if (username !== undefined) {
      if (typeof username !== 'string') {
        return res.status(400).json({
          error: 'Username must be text.'
        });
      }

      const cleanUsername = username.trim();

      if (!/^[a-zA-Z0-9_.]{3,30}$/.test(cleanUsername)) {
        return res.status(400).json({
          error:
            'Username must be 3-30 characters and may contain only letters, numbers, underscores and periods.'
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: cleanUsername,
          NOT: {
            id: userId
          }
        },
        select: {
          id: true
        }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username is already taken.'
        });
      }

      data.username = cleanUsername;
    }

    // -----------------------------
    // BIO
    // -----------------------------

    if (bio !== undefined) {
      if (bio !== null && typeof bio !== 'string') {
        return res.status(400).json({
          error: 'Bio must be text.'
        });
      }

      const cleanBio =
        bio === null ? null : bio.trim();

      if (cleanBio && cleanBio.length > 160) {
        return res.status(400).json({
          error: 'Bio cannot exceed 160 characters.'
        });
      }

      data.bio = cleanBio || null;
    }

    // -----------------------------
    // AVATAR URL
    // -----------------------------

    if (avatarUrl !== undefined) {
      if (
        avatarUrl !== null &&
        typeof avatarUrl !== 'string'
      ) {
        return res.status(400).json({
          error: 'Avatar URL must be text.'
        });
      }

      const cleanAvatarUrl =
        avatarUrl === null
          ? null
          : avatarUrl.trim();

      if (
        cleanAvatarUrl &&
        cleanAvatarUrl.length > 2048
      ) {
        return res.status(400).json({
          error: 'Avatar URL is too long.'
        });
      }

      data.avatarUrl = cleanAvatarUrl || null;
    }

    // -----------------------------
    // NOTHING TO UPDATE
    // -----------------------------

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error:
          'Please provide a username, bio or avatar URL to update.'
      });
    }

    const updatedUser =
      await prisma.user.update({
        where: {
          id: userId
        },
        data,
        select: {
          id: true,
          username: true,
          avatarUrl: true,
          bio: true,
          isCreatorVerified: true,
          isVerified: true,
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

    return res.status(200).json({
      message: 'Profile updated successfully.',
      profile: {
        id: updatedUser.id,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        isCreatorVerified:
          updatedUser.isCreatorVerified,
        isVerified: updatedUser.isVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,

        counts: {
          posts: updatedUser._count.posts,
          followers:
            updatedUser._count.followers,
          following:
            updatedUser._count.following
        }
      }
    });

  } catch (error) {
    console.error(
      'UPDATE PROFILE ERROR:',
      error
    );

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'That username is already taken.'
      });
    }

    return res.status(500).json({
      error: 'Server error while updating profile.'
    });
  }
};
