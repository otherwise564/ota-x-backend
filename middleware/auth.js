const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured.');

    return res.status(500).json({
      error: 'Authentication service is not configured.'
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    // Refresh lastSeenAt at most hourly to reduce database writes.
    if (Number.isSafeInteger(Number(decoded.id)) && Number(decoded.id) > 0) {
      const prisma = require('../config/db');
      prisma.user.updateMany({
        where: {
          id: Number(decoded.id),
          OR: [
            { lastSeenAt: null },
            { lastSeenAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }
          ]
        },
        data: { lastSeenAt: new Date() }
      }).catch(error => console.error('ACTIVITY TRACKING ERROR:', error.message));
    }

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token.'
    });
  }
};
