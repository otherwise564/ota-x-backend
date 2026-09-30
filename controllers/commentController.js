const prisma = require('../config/db');
const cloudinary = require('../config/cloudinary');


// =====================================================
// UPLOAD VOICE COMMENT TO CLOUDINARY
// =====================================================

const uploadVoiceToCloudinary = (buffer, userId) => {
  return new Promise((resolve, reject) => {
    const publicId =
      `otax/comments/voice/${userId}-${Date.now()}`;

    const stream =
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          public_id: publicId,
          folder: 'otax/comments/voice'
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          resolve(result);
        }
      );

    stream.end(buffer);
  });
};


// =====================================================
// CREATE COMMENT
// Supports:
// - Text comments
// - Voice comments
// - Text replies
// - Voice replies
// =====================================================

exports.createComment = async (req, res) => {
  let uploadedVoice = null;

  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    const text =
      typeof req.body.text === 'string'
        ? req.body.text.trim()
        : '';

    const parentId =
      req.body.parentId !== undefined &&
      req.body.parentId !== null &&
      req.body.parentId !== ''
        ? Number(req.body.parentId)
        : null;


    // -------------------------------------------------
    // Validate post ID
    // -------------------------------------------------

    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        error: 'Invalid post ID.'
      });
    }


    // -------------------------------------------------
    // Validate parent ID
    // -------------------------------------------------

    if (
      parentId !== null &&
      (!Number.isInteger(parentId) || parentId <= 0)
    ) {
      return res.status(400).json({
        error: 'Invalid parent comment ID.'
      });
    }


    // -------------------------------------------------
    // A comment must contain text OR voice
    // -------------------------------------------------

    if (!text && !req.file) {
      return res.status(400).json({
        error: 'Comment text or voice recording is required.'
      });
    }


    // -------------------------------------------------
    // Prevent sending both text and voice together
    // -------------------------------------------------

    if (text && req.file) {
      return res.status(400).json({
        error: 'Send either a text comment or a voice comment, not both.'
      });
    }


    // -------------------------------------------------
    // Text length protection
    // -------------------------------------------------

    if (text.length > 2000) {
      return res.status(400).json({
        error: 'Comment is too long. Maximum length is 2000 characters.'
      });
    }


    // -------------------------------------------------
    // Make sure post exists
    // -------------------------------------------------

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


    // -------------------------------------------------
    // Validate parent comment
    // -------------------------------------------------

    if (parentId !== null) {
      const parentComment =
        await prisma.comment.findUnique({
          where: {
            id: parentId
          }
        });

      if (!parentComment) {
        return res.status(404).json({
          error: 'Parent comment not found.'
        });
      }

      if (parentComment.postId !== postId) {
        return res.status(400).json({
          error:
            'Parent comment does not belong to this post.'
        });
      }
    }


    // -------------------------------------------------
    // Upload voice comment
    // -------------------------------------------------

    let voiceUrl = null;

    if (req.file) {
      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(503).json({
          error:
            'Voice comments are temporarily unavailable because media storage is not configured.'
        });
      }

      uploadedVoice =
        await uploadVoiceToCloudinary(
          req.file.buffer,
          userId
        );

      voiceUrl = uploadedVoice.secure_url;
    }


    // -------------------------------------------------
    // Create database comment
    // -------------------------------------------------

    const comment =
      await prisma.comment.create({
        data: {
          text: text || null,
          voiceUrl,
          userId,
          postId,
          parentId
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


    // -------------------------------------------------
    // Notify post owner
    // -------------------------------------------------

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


    // -------------------------------------------------
    // Response
    // -------------------------------------------------

    return res.status(201).json({
      message: 'Comment created successfully.',
      comment
    });

  } catch (error) {

    console.error(
      'CREATE COMMENT ERROR:',
      error
    );


    // -------------------------------------------------
    // Delete uploaded Cloudinary file if DB creation
    // failed after upload
    // -------------------------------------------------

    if (uploadedVoice?.public_id) {
      try {
        await cloudinary.uploader.destroy(
          uploadedVoice.public_id,
          {
            resource_type: 'video'
          }
        );
      } catch (cleanupError) {
        console.error(
          'CLOUDINARY CLEANUP ERROR:',
          cleanupError
        );
      }
    }


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


    // -------------------------------------------------
    // Make sure post exists
    // -------------------------------------------------

    const post =
      await prisma.post.findUnique({
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
    // Get top-level comments
    // -------------------------------------------------

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
