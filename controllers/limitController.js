const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const GUEST_MAX = 10;
const OFFLINE_MAX = 120;

async function getLimits() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  // Approximation based on lastSeenAt. Accurate MAU requires
  // recording activity across all meaningful user sessions.
  const mau = await prisma.user.count({
    where: { lastSeenAt: { gte: since } }
  });

  let guest = 2;
  let offline = 10;

  if (mau >= 25000) { guest = 10; offline = 120; }
  else if (mau >= 10000) { guest = 7; offline = 80; }
  else if (mau >= 5000) { guest = 5; offline = 50; }
  else if (mau >= 1000) { guest = 3; offline = 25; }

  return {
    monthlyActiveUsers: mau,
    guestVideoLimit: Math.min(guest, GUEST_MAX),
    offlineVideoLimit: Math.min(offline, OFFLINE_MAX)
  };
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function requireGuest(req, res) {
  const token = req.get('x-guest-token');
  if (!token || !process.env.JWT_SECRET) {
    res.status(401).json({ error: 'A valid guest session is required.' });
    return null;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'guest' || !payload.sid) throw new Error('Invalid guest token');

    const session = await prisma.guestSession.findUnique({
      where: { id: payload.sid }
    });

    if (!session ||
        session.expiresAt <= new Date() ||
        session.tokenHash !== hashToken(token)) {
      res.status(401).json({ error: 'Guest session expired. Start a new session.' });
      return null;
    }

    return session;
  } catch {
    res.status(401).json({ error: 'Invalid or expired guest session.' });
    return null;
  }
}

exports.startGuestSession = async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Guest sessions are not configured.' });
    }

    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const token = jwt.sign({ sid: id, type: 'guest' }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    await prisma.guestSession.create({
      data: {
        id,
        tokenHash: hashToken(token),
        expiresAt
      }
    });

    const limits = await getLimits();
    return res.status(201).json({
      guestToken: token,
      viewedVideos: 0,
      videoLimit: limits.guestVideoLimit,
      remainingVideos: limits.guestVideoLimit,
      expiresAt,
      limits
    });
  } catch (error) {
    console.error('START GUEST SESSION ERROR:', error);
    return res.status(500).json({ error: 'Could not start guest session.' });
  }
};

exports.getGuestStatus = async (req, res) => {
  try {
    const session = await requireGuest(req, res);
    if (!session) return;

    const limits = await getLimits();
    const viewedVideos = await prisma.guestPostView.count({
      where: { guestSessionId: session.id }
    });
    const videoLimit = limits.guestVideoLimit;

    return res.json({
      viewedVideos,
      videoLimit,
      remainingVideos: Math.max(0, videoLimit - viewedVideos),
      limits
    });
  } catch (error) {
    console.error('GUEST STATUS ERROR:', error);
    return res.status(500).json({ error: 'Could not retrieve guest status.' });
  }
};

exports.recordGuestView = async (req, res) => {
  try {
    const session = await requireGuest(req, res);
    if (!session) return;

    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, mediaType: true, mediaUrl: true }
    });

    if (!post || post.mediaType !== 'VIDEO' || !post.mediaUrl) {
      return res.status(404).json({ error: 'Video post not found.' });
    }

    const alreadyViewed = await prisma.guestPostView.findUnique({
      where: {
        guestSessionId_postId: {
          guestSessionId: session.id,
          postId
        }
      }
    });

    const limits = await getLimits();
    const count = await prisma.guestPostView.count({
      where: { guestSessionId: session.id }
    });

    if (!alreadyViewed && count >= limits.guestVideoLimit) {
      return res.status(403).json({
        error: 'Guest viewing limit reached. Sign in to keep watching.',
        viewedVideos: count,
        videoLimit: limits.guestVideoLimit,
        remainingVideos: 0
      });
    }

    if (!alreadyViewed) {
      try {
        await prisma.guestPostView.create({
          data: { guestSessionId: session.id, postId }
        });
        await prisma.guestSession.update({
          where: { id: session.id },
          data: { videosViewed: { increment: 1 }, lastSeenAt: new Date() }
        });
      } catch (error) {
        // Concurrent duplicate view attempts are harmless.
        if (error.code !== 'P2002') throw error;
      }
    } else {
      await prisma.guestSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() }
      });
    }

    const updatedCount = await prisma.guestPostView.count({
      where: { guestSessionId: session.id }
    });

    return res.json({
      recorded: !alreadyViewed,
      viewedVideos: updatedCount,
      videoLimit: limits.guestVideoLimit,
      remainingVideos: Math.max(0, limits.guestVideoLimit - updatedCount)
    });
  } catch (error) {
    console.error('RECORD GUEST VIEW ERROR:', error);
    return res.status(500).json({ error: 'Could not record video view.' });
  }
};

exports.getOfflineStatus = async (req, res) => {
  try {
    const userId = Number(req.user && req.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Valid account authentication is required.' });
    }

    const limits = await getLimits();
    const downloadedVideos = await prisma.offlineDownload.count({
      where: { userId }
    });

    return res.json({
      downloadedVideos,
      videoLimit: limits.offlineVideoLimit,
      remainingVideos: Math.max(0, limits.offlineVideoLimit - downloadedVideos),
      limits
    });
  } catch (error) {
    console.error('OFFLINE STATUS ERROR:', error);
    return res.status(500).json({ error: 'Could not retrieve offline-download status.' });
  }
};

exports.registerOfflineDownload = async (req, res) => {
  try {
    const userId = Number(req.user && req.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Valid account authentication is required.' });
    }

    const postId = Number(req.params.postId);
    if (!Number.isSafeInteger(postId) || postId <= 0) {
      return res.status(400).json({ error: 'Invalid post ID.' });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, mediaType: true, mediaUrl: true }
    });

    if (!post || post.mediaType !== 'VIDEO' || !post.mediaUrl) {
      return res.status(404).json({ error: 'Downloadable video not found.' });
    }

    const existing = await prisma.offlineDownload.findUnique({
      where: { userId_postId: { userId, postId } }
    });

    const limits = await getLimits();
    const count = await prisma.offlineDownload.count({ where: { userId } });

    if (!existing && count >= limits.offlineVideoLimit) {
      return res.status(403).json({
        error: 'Offline-download limit reached.',
        downloadedVideos: count,
        videoLimit: limits.offlineVideoLimit,
        remainingVideos: 0
      });
    }

    if (!existing) {
      try {
        await prisma.offlineDownload.create({ data: { userId, postId } });
      } catch (error) {
        if (error.code !== 'P2002') throw error;
      }
    }

    const downloadedVideos = await prisma.offlineDownload.count({ where: { userId } });

    return res.status(existing ? 200 : 201).json({
      registered: true,
      downloadedVideos,
      videoLimit: limits.offlineVideoLimit,
      remainingVideos: Math.max(0, limits.offlineVideoLimit - downloadedVideos),
      mediaUrl: post.mediaUrl,
      note: 'This records the download allowance. The client must still download and store the media for offline playback.'
    });
  } catch (error) {
    console.error('REGISTER OFFLINE DOWNLOAD ERROR:', error);
    return res.status(500).json({ error: 'Could not register offline download.' });
  }
};
