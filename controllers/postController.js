const prisma = require('../config/db');

// =====================================================
// CREATE POST
// =====================================================

exports.createPost = async (req, res) => {
  try {
    const {
      caption,
      mediaUrl,
      thumbnailUrl,
      mediaType,
      durationSeconds,
      song,
      soundUrl,
      hashtags,
      mentions
    } = req.body;

    // The authenticated user's ID comes from JWT middleware
    const authorId = req.user.id;

    // -------------------------------------------------
    // VALIDATE CONTENT
    // -------------------------------------------------

    const cleanCaption =
      typeof caption === 'string'
        ? caption.trim()
        : '';

    const cleanMediaUrl =
      typeof mediaUrl === 'string'
        ? mediaUrl.trim()
        : '';

    const cleanThumbnailUrl =
      typeof thumbnailUrl === 'string'
        ? thumbnailUrl.trim()
        : '';

    const cleanSong =
      typeof song === 'string'
        ? song.trim()
        : '';

    const cleanSoundUrl =
      typeof soundUrl === 'string'
        ? soundUrl.trim()
        : '';

    // A post must contain text or media
    if (!cleanCaption && !cleanMediaUrl) {
      return res.status(400).json({
        error: 'A post must contain text or media.'
      });
    }

    // -------------------------------------------------
    // VALIDATE MEDIA TYPE
    // -------------------------------------------------

    const allowedMediaTypes = [
      'TEXT',
      'IMAGE',
      'VIDEO'
    ];

    let selectedMediaType = mediaType;

    if (!selectedMediaType) {
      selectedMediaType = cleanMediaUrl
        ? 'VIDEO'
        : 'TEXT';
    }

    if (!allowedMediaTypes.includes(selectedMediaType)) {
      return res.status(400).json({
        error: 'Invalid media type.'
      });
    }

    // Text posts should not claim to have media
    if (
      selectedMediaType === 'TEXT' &&
      cleanMediaUrl
    ) {
      return res.status(400).json({
        error:
          'Text posts cannot contain a media URL.'
      });
    }

    // Image/video posts should contain media
    if (
      (selectedMediaType === 'IMAGE' ||
        selectedMediaType === 'VIDEO') &&
      !cleanMediaUrl
    ) {
      return res.status(400).json({
        error:
          'Image and video posts require a media URL.'
      });
    }

    // -------------------------------------------------
    // VALIDATE DURATION
    // -------------------------------------------------

    let cleanDuration = null;

    if (durationSeconds !== undefined && durationSeconds !== null) {
      const parsedDuration =
        Number(durationSeconds);

      if (
        !Number.isFinite(parsedDuration) ||
        parsedDuration < 0
      ) {
        return res.status(400).json({
          error:
            'durationSeconds must be a valid positive number.'
        });
      }

      cleanDuration = Math.floor(parsedDuration);
    }

    // -------------------------------------------------
    // CLEAN HASHTAGS
    // -------------------------------------------------

    const cleanHashtags = Array.isArray(hashtags)
      ? hashtags
          .filter(tag => typeof tag === 'string')
          .map(tag =>
            tag.trim().replace(/^#/, '')
          )
          .filter(Boolean)
          .slice(0, 30)
      : [];

    // -------------------------------------------------
    // CLEAN MENTIONS
    // -------------------------------------------------

    const cleanMentions = Array.isArray(mentions)
      ? mentions
          .filter(username => typeof username === 'string')
          .map(username =>
            username.trim().replace(/^@/, '')
          )
          .filter(Boolean)
          .slice(0, 30)
      : [];

    // -------------------------------------------------
    // CREATE REAL DATABASE POST
    // -------------------------------------------------

    const newPost = await prisma.post.create({
      data: {
        caption: cleanCaption || null,

        mediaUrl:
          cleanMediaUrl || null,

        thumbnailUrl:
          cleanThumbnailUrl || null,

        mediaType: selectedMediaType,

        durationSeconds:
          cleanDuration,

        song:
          cleanSong || null,

        soundUrl:
          cleanSoundUrl || null,

        hashtags:
          cleanHashtags,

        mentions:
          cleanMentions,

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
      message:
        'Post created successfully.',

      post: newPost
    });

  } catch (error) {
    console.error(
      'CREATE POST ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while creating post.'
    });
  }
};


// =====================================================
// GET GLOBAL OTA X FEED
// =====================================================

exports.getAllPosts = async (req, res) => {
  try {
    const posts =
      await prisma.post.findMany({
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
    console.error(
      'FETCH POSTS ERROR:',
      error
    );

    return res.status(500).json({
      error:
        'Server error while fetching posts.'
    });
  }
};
