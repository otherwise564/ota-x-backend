const prisma = require('../config/db');

// =====================================================
// CREATE COMMENT
// =====================================================

exports.createComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);
    const { text, parentId } = req.body;

    // Validate post ID
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }

    // Validate comment text
    if (
      typeof text !== 'string' ||
      !text.trim()
    ) {
      return res.status(400).json({
        error: 'Comment text is required.'
      });
    }

    const cleanText = text.trim();

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

    // Optional parent comment for replies
    let cleanParentId = null;

    if (parentId !== undefined && parentId !== null) {
      cleanParentId = Number(parentId);

      if (
        !Number.isInteger(cleanParentId) ||
        cleanParentId <= 0
      ) {
        return res.status(400).json({
          error: 'Invalid parent comment ID.'
        });
      }

      const parentComment =
        await prisma.comment.findUnique({
          where: {
            id: cleanParentId
          }
        });

      if (!parentComment) {
        return res.status(404).json({
          error: 'Parent comment not found.'
        });
      }

      // Prevent replying to a comment belonging
      // to a different post.
      if (parentComment.postId !== postId) {
        return res.status(400).json({
          error:
            'Parent comment does not belong to this post.'
        });
      }
    }

    // Create real database comment
    const comment = await prisma.comment.create({
      data: {
        text: cleanText,
        userId,
        postId,
        parentId: cleanParentId
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

        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    // Notify post owner
    if (post.authorId !== userId) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: userId,
          type: 'COMMENT',
          message: 'commented on your post',
          postId,
          commentId: comment.id
        }
      });
    }

    return res.status(201).json({
      message: 'Comment created successfully.',
      comment
    });

  } catch (error) {
    console.error(
      'CREATE COMMENT ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while creating comment.'
    });
  }
};


// =====================================================
// GET COMMENTS FOR A POST
// =====================================================

exports.getPostComments = async (req, res) => {
  try {
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId) || postId <= 0) {
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

    const comments =
      await prisma.comment.findMany({
        where: {
          postId,
          parentId: null
        },

        orderBy: {
          createdAt: 'asc'
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

          replies: {
            orderBy: {
              createdAt: 'asc'
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

              _count: {
                select: {
                  likes: true
                }
              }
            }
          },

          _count: {
            select: {
              likes: true,
              replies: true
            }
          }
        }
      });

    return res.status(200).json({
      comments
    });

  } catch (error) {
    console.error(
      'GET COMMENTS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching comments.'
    });
  }
};
