const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function extractBearerToken(authHeader) {
  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.operatorId = payload.operatorId;
    req.userId = payload.userId;
    req.userRole = payload.role;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = {
  authMiddleware,
  extractBearerToken,
  verifyAccessToken,
};
