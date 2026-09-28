const prisma = require('../config/db');

// LIKE a post
exports.likePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId)) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // Make sure the post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Post not found.'
      });
    }

    // Check if this user already liked the post
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
        where: { postId }
      });

      return res.status(200).json({
        message: 'Post already liked.',
        liked: true,
        likeCount
      });
    }

    // Create the real database like
    await prisma.like.create({
      data: {
        userId,
        postId
      }
    });

    // Notify the post owner, but don't notify yourself
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
      where: { postId }
    });

    return res.status(201).json({
      message: 'Post liked successfully.',
      liked: true,
      likeCount
    });

  } catch (error) {
    console.error('LIKE POST ERROR:', error);

    return res.status(500).json({
      error: 'Server error while liking post.'
    });
  }
};


// UNLIKE a post
exports.unlikePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId)) {
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
        where: { postId }
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
      where: { postId }
    });

    return res.status(200).json({
      message: 'Post unliked successfully.',
      liked: false,
      likeCount
    });

  } catch (error) {
    console.error('UNLIKE POST ERROR:', error);

    return res.status(500).json({
      error: 'Server error while unliking post.'
    });
  }
};
