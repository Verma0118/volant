const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../config');
const { getUserByEmail } = require('../repositories/userRepository');

const router = express.Router();

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

    return res.json({ token });
  } catch (err) {
    console.error('POST /api/auth/login failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  authRoutes: router,
  buildTokenPayload,
};
