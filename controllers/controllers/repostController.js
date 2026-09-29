const prisma = require('../config/db');

// =====================================================
// REPOST A POST
// =====================================================

exports.repostPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    const { comment } = req.body;

    if (
      !Number.isInteger(postId) ||
      postId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId
      }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Post not found.'
      });
    }

    let cleanComment = null;

    if (
      comment !== undefined &&
      comment !== null
    ) {
      if (typeof comment !== 'string') {
        return res.status(400).json({
          error: 'Repost comment must be text.'
        });
      }

      cleanComment = comment.trim();

      if (cleanComment.length > 500) {
        return res.status(400).json({
          error:
            'Repost comment cannot exceed 500 characters.'
        });
      }

      if (!cleanComment) {
        cleanComment = null;
      }
    }

    const existingRepost =
      await prisma.repost.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    if (existingRepost) {
      const repostCount =
        await prisma.repost.count({
          where: {
            postId
          }
        });

      return res.status(200).json({
        message: 'Post already reposted.',
        reposted: true,
        repostCount
      });
    }

    let repost;

    try {
      repost = await prisma.repost.create({
        data: {
          userId,
          postId,
          comment: cleanComment
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              isCreatorVerified: true
            }
          },
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  isCreatorVerified: true
                }
              }
            }
          }
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const repostCount =
          await prisma.repost.count({
            where: {
              postId
            }
          });

        return res.status(200).json({
          message: 'Post already reposted.',
          reposted: true,
          repostCount
        });
      }

      throw error;
    }

    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'REPOST',
          message: 'reposted your post',
          postId
        }
      });
    }

    const repostCount =
      await prisma.repost.count({
        where: {
          postId
        }
      });

    return res.status(201).json({
      message: 'Post reposted successfully.',
      reposted: true,
      repostCount,
      repost
    });

  } catch (error) {
    console.error(
      'REPOST POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while reposting post.'
    });
  }
};

// =====================================================
// REMOVE REPOST
// =====================================================

exports.unrepostPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    if (
      !Number.isInteger(postId) ||
      postId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    const existingRepost =
      await prisma.repost.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    if (!existingRepost) {
      const repostCount =
        await prisma.repost.count({
          where: {
            postId
          }
        });

      return res.status(200).json({
        message: 'Post is not reposted.',
        reposted: false,
        repostCount
      });
    }

    await prisma.repost.delete({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    const repostCount =
      await prisma.repost.count({
        where: {
          postId
        }
      });

    return res.status(200).json({
      message: 'Repost removed successfully.',
      reposted: false,
      repostCount
    });

  } catch (error) {
    console.error(
      'UNREPOST POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while removing repost.'
    });
  }
};
 // =====================================================
// GET REPOST STATUS
// =====================================================

exports.getRepostStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    if (
      !Number.isInteger(postId) ||
      postId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    const repost =
      await prisma.repost.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    const repostCount =
      await prisma.repost.count({
        where: {
          postId
        }
      });

    return res.status(200).json({
      reposted: Boolean(repost),
      repostCount
    });

  } catch (error) {
    console.error(
      'GET REPOST STATUS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while checking repost status.'
    });
  }
};

// =====================================================
// GET MY REPOSTS
// =====================================================

exports.getMyReposts = async (req, res) => {
  try {
    const userId = req.user.id;

    const reposts =
      await prisma.repost.findMany({
        where: {
          userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              isCreatorVerified: true
            }
          },
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                  isCreatorVerified: true
                }
              },
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

    return res.status(200).json({
      reposts
    });

  } catch (error) {
    console.error(
      'GET MY REPOSTS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching reposts.'
    });
  }
};
