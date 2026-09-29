const prisma = require('../config/db');

// =====================================================
// SAVE / FAVORITE A POST
// =====================================================

exports.favoritePost = async (req, res) => {
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

    const existingFavorite =
      await prisma.favorite.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    if (existingFavorite) {
      const favoriteCount =
        await prisma.favorite.count({
          where: {
            postId
          }
        });

      return res.status(200).json({
        message: 'Post is already saved.',
        saved: true,
        favoriteCount
      });
    }

    try {
      await prisma.favorite.create({
        data: {
          userId,
          postId
        }
      });
    } catch (error) {
      if (error.code === 'P2002') {
        const favoriteCount =
          await prisma.favorite.count({
            where: {
              postId
            }
          });

        return res.status(200).json({
          message: 'Post is already saved.',
          saved: true,
          favoriteCount
        });
      }

      throw error;
    }

    const favoriteCount =
      await prisma.favorite.count({
        where: {
          postId
        }
      });

    return res.status(201).json({
      message: 'Post saved successfully.',
      saved: true,
      favoriteCount
    });
  } catch (error) {
    console.error(
      'FAVORITE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while saving post.'
    });
  }
};

// =====================================================
// REMOVE POST FROM SAVED
// =====================================================

exports.unfavoritePost = async (req, res) => {
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

    const existingFavorite =
      await prisma.favorite.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    if (!existingFavorite) {
      const favoriteCount =
        await prisma.favorite.count({
          where: {
            postId
          }
        });

      return res.status(200).json({
        message: 'Post is not saved.',
        saved: false,
        favoriteCount
      });
    }

    await prisma.favorite.delete({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    const favoriteCount =
      await prisma.favorite.count({
        where: {
          postId
        }
      });

    return res.status(200).json({
      message: 'Post removed from saved.',
      saved: false,
      favoriteCount
    });
  } catch (error) {
    console.error(
      'UNFAVORITE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while removing saved post.'
    });
  }
};

// =====================================================
// GET SAVED POSTS
// =====================================================

exports.getMyFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites =
      await prisma.favorite.findMany({
        where: {
          userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
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
      favorites
    });
  } catch (error) {
    console.error(
      'GET FAVORITES ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching saved posts.'
    });
  }
};

// =====================================================
// CHECK SAVE STATUS
// =====================================================

exports.getFavoriteStatus = async (req, res) => {
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

    const favorite =
      await prisma.favorite.findUnique({
        where: {
          userId_postId: {
            userId,
            postId
          }
        }
      });

    const favoriteCount =
      await prisma.favorite.count({
        where: {
          postId
        }
      });

    return res.status(200).json({
      saved: Boolean(favorite),
      favoriteCount
    });
  } catch (error) {
    console.error(
      'GET FAVORITE STATUS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while checking saved status.'
    });
  }
};
