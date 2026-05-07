const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { JWT_SECRET, JWT_COOKIE_NAME, CSRF_COOKIE_NAME, NODE_ENV } = require('../config');
const { authMiddleware } = require('../middleware/auth');
const { issueCsrfToken, ensureCsrfToken, requireCsrfToken } = require('../middleware/csrf');
const { getUserByEmail } = require('../repositories/userRepository');

const router = express.Router();

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function buildTokenPayload(user) {
  return {
    userId: user.id,
    operatorId: user.operator_id,
    role: user.role,
  };
}

router.post('/login', async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: '8h' });
    res.cookie(JWT_COOKIE_NAME, token, authCookieOptions());
    const csrfToken = issueCsrfToken(res);

    return res.json({ ok: true, csrfToken });
  } catch (err) {
    console.error('POST /api/auth/login failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authMiddleware, requireCsrfToken, (_req, res) => {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
  });
  return res.json({ ok: true });
});

router.get('/session', authMiddleware, (req, res) => {
  const csrfToken = ensureCsrfToken(req, res);
  return res.json({
    authenticated: true,
    csrfToken,
    user: {
      userId: req.userId,
      operatorId: req.operatorId,
      role: req.userRole || 'dispatcher',
    },
  });
});

module.exports = {
  authRoutes: router,
  buildTokenPayload,
};
