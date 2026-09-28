const prisma = require('../config/db');

// Create a real OTA X post
exports.createPost = async (req, res) => {
  try {
    const {
      caption,
      mediaUrl,
      mediaType,
      song,
      hashtags,
      mentions
    } = req.body;

    const authorId = req.user.id;

    // A post must contain text or media
    if (!caption?.trim() && !mediaUrl) {
      return res.status(400).json({
        error: 'A post must contain text or media.'
      });
    }

    // Validate media type
    const allowedMediaTypes = ['TEXT', 'IMAGE', 'VIDEO'];
    const selectedMediaType = mediaType || (mediaUrl ? 'VIDEO' : 'TEXT');

    if (!allowedMediaTypes.includes(selectedMediaType)) {
      return res.status(400).json({
        error: 'Invalid media type.'
      });
    }

    // Clean hashtags and mentions
    const cleanHashtags = Array.isArray(hashtags)
      ? hashtags
          .filter(tag => typeof tag === 'string')
          .map(tag => tag.trim().replace(/^#/, ''))
          .filter(Boolean)
      : [];

    const cleanMentions = Array.isArray(mentions)
      ? mentions
          .filter(username => typeof username === 'string')
          .map(username => username.trim().replace(/^@/, ''))
          .filter(Boolean)
      : [];

    const newPost = await prisma.post.create({
      data: {
        caption: caption?.trim() || null,
        mediaUrl: mediaUrl || null,
        mediaType: selectedMediaType,
        song: song?.trim() || null,
        hashtags: cleanHashtags,
        mentions: cleanMentions,
        authorId
      },
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
    });

    return res.status(201).json({
      message: 'Post created successfully!',
      post: newPost
    });

  } catch (error) {
    console.error('CREATE POST ERROR:', error);

    return res.status(500).json({
      error: 'Server error while creating post.'
    });
  }
};


// Get the global OTA X feed
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc'
      },

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
    });

    return res.status(200).json({
      posts
    });

  } catch (error) {
    console.error('FETCH POSTS ERROR:', error);

    return res.status(500).json({
      error: 'Server error while fetching posts.'
    });
  }
};
