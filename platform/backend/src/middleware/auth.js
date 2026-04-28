const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_COOKIE_NAME } = require('../config');

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

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey || rest.length === 0) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function extractCookieToken(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  return cookies[JWT_COOKIE_NAME] || null;
}

function extractAccessToken(headers = {}) {
  return (
    extractBearerToken(headers.authorization) ||
    extractCookieToken(headers.cookie)
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const token = extractAccessToken(req.headers);
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
  extractCookieToken,
  extractAccessToken,
  parseCookieHeader,
  verifyAccessToken,
};
