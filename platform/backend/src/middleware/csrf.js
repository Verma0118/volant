const crypto = require('crypto');
const { CSRF_COOKIE_NAME, NODE_ENV } = require('../config');
const { parseCookieHeader } = require('./auth');

function csrfCookieOptions() {
  return {
    httpOnly: false,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getCsrfTokenFromCookies(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[CSRF_COOKIE_NAME] || '';
}

function issueCsrfToken(res) {
  const csrfToken = createCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions());
  return csrfToken;
}

function ensureCsrfToken(req, res) {
  const existing = getCsrfTokenFromCookies(req);
  if (existing) {
    return existing;
  }
  return issueCsrfToken(res);
}

function requireCsrfToken(req, res, next) {
  const expected = getCsrfTokenFromCookies(req);
  const received = req.headers['x-csrf-token'];
  if (!expected || !received || expected !== received) {
    return res.status(403).json({ error: 'CSRF token mismatch' });
  }
  return next();
}

module.exports = {
  issueCsrfToken,
  ensureCsrfToken,
  requireCsrfToken,
  csrfCookieOptions,
};
