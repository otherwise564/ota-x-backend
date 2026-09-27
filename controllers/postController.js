const prisma = require('../config/db');

// Create a new global post
exports.createPost = async (req, res) => {
  try {
    const { caption, mediaUrl, song } = req.body;
    const authorId = req.user.id;

    if (!mediaUrl) {
      return res.status(400).json({ error: 'Media URL is required for a post.' });
    }

    const newPost = await prisma.post.create({
      data: {
        caption: caption || '',
        mediaUrl: mediaUrl,
        song: song || 'Original Sound',
        authorId: authorId
      },
      include: {
        author: {
          select: { username: true, avatarUrl: true }
        }
      }
    });

    return res.status(201).json({
      message: 'Post created successfully!',
      post: newPost
    });
  } catch (error) {
    console.error('CREATE POST ERROR:', error);
    return res.status(500).json({ error: 'Server error while creating post.' });
  }
};

// Fetch all global posts for the feed
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { username: true, avatarUrl: true }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    return res.status(200).json(posts);
  } catch (error) {
    console.error('FETCH POSTS ERROR:', error);
    return res.status(500).json({ error: 'Server error while fetching posts.' });
  }
};
