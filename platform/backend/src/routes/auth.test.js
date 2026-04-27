const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTokenPayload } = require('./auth');

test('buildTokenPayload maps user fields to JWT payload', () => {
  const payload = buildTokenPayload({
    id: 'user-123',
    operator_id: 'op-123',
    role: 'dispatcher',
  });

  assert.deepEqual(payload, {
    userId: 'user-123',
    operatorId: 'op-123',
    role: 'dispatcher',
  });
});
