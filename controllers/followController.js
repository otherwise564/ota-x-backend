const prisma = require('../config/db');

exports.followUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = Number(req.params.userId);

    if (
      !Number.isInteger(followingId) ||
      followingId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        error: 'You cannot follow yourself.'
      });
    }

    const userToFollow = await prisma.user.findUnique({
      where: {
        id: followingId
      }
    });

    if (!userToFollow) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      const followerCount = await prisma.follow.count({
        where: {
          followingId
        }
      });

      return res.status(200).json({
        message: 'You are already following this user.',
        following: true,
        followerCount
      });
    }

    try {
      await prisma.follow.create({
        data: {
          followerId,
          followingId
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const followerCount = await prisma.follow.count({
          where: {
            followingId
          }
        });

        return res.status(200).json({
          message: 'You are already following this user.',
          following: true,
          followerCount
        });
      }

      throw error;
    }

    if (userToFollow.id !== followerId) {
      await prisma.notification.create({
        data: {
          recipientId: followingId,
          actorId: followerId,
          type: 'FOLLOW',
          message: 'started following you'
        }
      });
    }

    const followerCount = await prisma.follow.count({
      where: {
        followingId
      }
    });

    return res.status(201).json({
      message: 'User followed successfully.',
      following: true,
      followerCount
    });
  } catch (error) {
    console.error(
      'FOLLOW USER ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while following user.'
    });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = Number(req.params.userId);

    if (
      !Number.isInteger(followingId) ||
      followingId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (!existingFollow) {
      const followerCount = await prisma.follow.count({
        where: {
          followingId
        }
      });

      return res.status(200).json({
        message: 'You are not following this user.',
        following: false,
        followerCount
      });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    const followerCount = await prisma.follow.count({
      where: {
        followingId
      }
    });

    return res.status(200).json({
      message: 'User unfollowed successfully.',
      following: false,
      followerCount
    });
  } catch (error) {
    console.error(
      'UNFOLLOW USER ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while unfollowing user.'
    });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isCreatorVerified: true
          }
        }
      }
    });

    return res.status(200).json({
      followers
    });
  } catch (error) {
    console.error(
      'GET FOLLOWERS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching followers.'
    });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

    const following = await prisma.follow.findMany({
      where: {
        followerId: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isCreatorVerified: true
          }
        }
      }
    });

    return res.status(200).json({
      following
    });
  } catch (error) {
    console.error(
      'GET FOLLOWING ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching following.'
    });
  }
};

exports.getFollowStatus = async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = Number(req.params.userId);

    if (
      !Number.isInteger(followingId) ||
      followingId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid user ID.'
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    const followerCount = await prisma.follow.count({
      where: {
        followingId
      }
    });

    const followingCount = await prisma.follow.count({
      where:
{
        followerId: followingId
      }
    });

    return res.status(200).json({
      following: Boolean(existingFollow),
      followerCount,
      followingCount
    });
  } catch (error) {
    console.error(
      'GET FOLLOW STATUS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while checking follow status.'
    });
  }
};
