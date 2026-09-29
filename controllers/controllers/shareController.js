const prisma = require('../config/db');

// =====================================================
// SHARE A POST
// =====================================================

exports.sharePost = async (req, res) => {
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

    await prisma.share.create({
      data: {
        userId,
        postId
      }
    });

    const shareCount = await prisma.share.count({
      where: {
        postId
      }
    });

    return res.status(201).json({
      message: 'Post shared successfully.',
      shareCount
    });
  } catch (error) {
    console.error(
      'SHARE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while sharing post.'
    });
  }
};

// =====================================================
// GET SHARE COUNT
// =====================================================

exports.getShareCount = async (req, res) => {
  try {
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
      },
      select: {
        id: true
      }
    });

    if (!post) {
      return res.status(404).json({
        error: 'Post not found.'
      });
    }

    const shareCount = await prisma.share.count({
      where: {
        postId
      }
    });

    return res.status(200).json({
      shareCount
    });
  } catch (error) {
    console.error(
      'GET SHARE COUNT ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while getting share count.'
    });
  }
};
