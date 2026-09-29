const prisma = require('../config/db');

// =====================================================
// LIKE A POST
// =====================================================

exports.likePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    // Validate post ID
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // Make sure the post exists
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

    // Check whether the user already liked this post
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (existingLike) {
      const likeCount = await prisma.like.count({
        where: {
          postId
        }
      });

      return res.status(200).json({
        message: 'Post already liked.',
        liked: true,
        likeCount
      });
    }

    // Create the real database like
    try {
      await prisma.like.create({
        data: {
          userId,
          postId
        }
      });
    } catch (error) {
      // Prisma unique constraint:
      // another request may have created the like
      // at almost the same time.
      if (error.code === 'P2002') {
        const likeCount = await prisma.like.count({
          where: {
            postId
          }
        });

        return res.status(200).json({
          message: 'Post already liked.',
          liked: true,
          likeCount
        });
      }

      throw error;
    }

    // Create notification for the post owner
    // Do not notify the user who liked their own post.
    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'LIKE',
          message: 'liked your post',
          postId
        }
      });
    }

    const likeCount = await prisma.like.count({
      where: {
        postId
      }
    });

    return res.status(201).json({
      message: 'Post liked successfully.',
      liked: true,
      likeCount
    });

  } catch (error) {
    console.error(
      'LIKE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while liking post.'
    });
  }
};


// =====================================================
// UNLIKE A POST
// =====================================================

exports.unlikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    // Validate post ID
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    if (!existingLike) {
      const likeCount = await prisma.like.count({
        where: {
          postId
        }
      });

      return res.status(200).json({
        message: 'Post is already unliked.',
        liked: false,
        likeCount
      });
    }

    await prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    });

    const likeCount = await prisma.like.count({
      where: {
        postId
      }
    });

    return res.status(200).json({
      message: 'Post unliked successfully.',
      liked: false,
      likeCount
    });

  } catch (error) {
    console.error(
      'UNLIKE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while unliking post.'
    });
  }
};
