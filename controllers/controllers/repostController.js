const prisma = require('../config/db');

// =====================================================
// REPOST A POST
// =====================================================

exports.repostPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    const {
      comment
    } = req.body;

    // ---------------------------------------------------
    // Validate post ID
    // ---------------------------------------------------

    if (
      !Number.isInteger(postId) ||
      postId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // ---------------------------------------------------
    // Check that the post exists
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // Clean optional repost comment
    // ---------------------------------------------------

    let cleanComment = null;

    if (comment !== undefined && comment !== null) {
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

    // ---------------------------------------------------
    // Check whether user already reposted this post
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // Create repost
    // ---------------------------------------------------

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
      // Handle duplicate repost race condition
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

    // ---------------------------------------------------
    // Notify original post owner
    // ---------------------------------------------------

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

    // ---------------------------------------------------
    // Get updated repost count
    // ---------------------------------------------------

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
