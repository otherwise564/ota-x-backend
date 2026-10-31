const supabase = require('../config/supabase');
const prisma = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Invalid or expired token.'
      });
    }

    const profile = await prisma.user.findUnique({
      where: { supabaseAuthId: data.user.id }
    });

    if (!profile) {
      return res.status(401).json({
        error: 'OTA X user profile not found.'
      });
    }

    if (!profile.isActive) {
      return res.status(403).json({
        error: 'This account is disabled.'
      });
    }

    req.user = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      role: profile.role,
      supabaseAuthId: data.user.id
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (!profile.lastSeenAt || profile.lastSeenAt < oneHourAgo) {
      prisma.user.updateMany({
        where: {
          id: profile.id,
          OR: [
            { lastSeenAt: null },
            { lastSeenAt: { lt: oneHourAgo } }
          ]
        },
        data: { lastSeenAt: new Date() }
      }).catch(error => {
        console.error('Activity tracking error:', error.message);
      });
    }

    return next();
  } catch (error) {
    console.error('Authentication middleware error:', error.message);

    return res.status(500).json({
      error: 'Authentication service temporarily unavailable.'
    });
  }
};
