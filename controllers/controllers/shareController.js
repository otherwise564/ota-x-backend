const prisma = require('../config/db');

// =====================================================
// SHARE A POST
// =====================================================

exports.sharePost = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const postId = Number(req.params.postId);

    // -------------------------------------------------
    // Validate authenticated user
    // -------------------------------------------------

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        error: 'Invalid authenticated user.'
      });
    }

    // -------------------------------------------------
    // Validate post ID
    // -------------------------------------------------

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // -------------------------------------------------
    // Make sure the post exists
    // -------------------------------------------------

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

    // -------------------------------------------------
    // Check whether this user already shared the post
    // -------------------------------------------------

    const existingShare = await prisma.share.findFirst({
      where: {
        userId,
        postId
      }
    });

    // -------------------------------------------------
    // Already shared
    // -------------------------------------------------

    if (existingShare) {
      const shareCount = await prisma.share.count({
        where: {
          postId
        }
      });

      return res.status(200).json({
        message: 'Post already shared.',
        shared: true,
        shareCount
      });
    }

    // -------------------------------------------------
    // Create share
    // -------------------------------------------------

    await prisma.share.create({
      data: {
        userId,
        postId
      }
    });

    // -------------------------------------------------
    // Get updated share count
    // -------------------------------------------------

    const shareCount = await prisma.share.count({
      where: {
        postId
      }
    });

    return res.status(201).json({
      message: 'Post shared successfully.',
      shared: true,
      shareCount
    });
  } catch (error) {
    console.error('SHARE POST ERROR:', error);

    // Handle a race condition where two requests arrive
    // at almost exactly the same time.
    if (error.code === 'P2002') {
      try {
        const postId = Number(req.params.postId);

        const shareCount = await prisma.share.count({
          where: {
            postId
          }
        });

        return res.status(200).json({
          message: 'Post already shared.',
          shared: true,
          shareCount
        });
      } catch (countError) {
        console.error(
          'SHARE COUNT AFTER DUPLICATE ERROR:',
          countError
        );
      }
    }

    return res.status(500).json({
      error: 'Server error while sharing post.'
    });
  }
};

// =====================================================
// GET SHARE COUNT
// =====================================================

exports.getShareCount = async (req, res) => {
  try {
    const postId = Number(req.params.postId);

    // -------------------------------------------------
    // Validate post ID
    // -------------------------------------------------

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // -------------------------------------------------
    // Make sure the post exists
    // -------------------------------------------------

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

    // -------------------------------------------------
    // Count shares
    // -------------------------------------------------

    const shareCount = await prisma.share.count({
      where: {
        postId
      }
    });

    return res.status(200).json({
      postId,
      shareCount
    });
  } catch (error) {
    console.error(
      'GET SHARE COUNT ERROR:',
      error
    );

    return res.status(500).json({
      error: 'Server error while getting share count.'
    });
  }
};
