const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  extractBearerToken,
  verifyAccessToken,
  authMiddleware,
} = require('./auth');
const { JWT_SECRET } = require('../config');

test('extractBearerToken returns token for valid Bearer header', () => {
  const token = extractBearerToken('Bearer abc.def.ghi');
  assert.equal(token, 'abc.def.ghi');
});

test('extractBearerToken returns null for malformed headers', () => {
  assert.equal(extractBearerToken('Token abc'), null);
  assert.equal(extractBearerToken('Bearer'), null);
  assert.equal(extractBearerToken(undefined), null);
});

test('verifyAccessToken validates signed tokens', () => {
  const signed = jwt.sign({ operatorId: 'op-1', userId: 'user-1' }, JWT_SECRET);
  const payload = verifyAccessToken(signed);
  assert.equal(payload.operatorId, 'op-1');
  assert.equal(payload.userId, 'user-1');
});

test('authMiddleware returns 401 when token is missing', () => {
  const req = { headers: {} };
  let statusCode = 200;
  let body;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return payload;
    },
  };

  let nextCalled = false;
  authMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: 'No token' });
});
