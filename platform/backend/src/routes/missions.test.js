const test = require('node:test');
const assert = require('node:assert/strict');

const { validateMissionPayload } = require('./missionValidation');

test('validateMissionPayload accepts valid mission payload', () => {
  const result = validateMissionPayload({
    origin_lat: 32.7767,
    origin_lng: -96.797,
    dest_lat: 32.8998,
    dest_lng: -97.0403,
    cargo_type: 'medical',
    priority: 'urgent',
  });

  assert.equal(result.valid, true);
  assert.equal(result.value.priority, 'urgent');
  assert.equal(result.value.cargoType, 'medical');
});

test('validateMissionPayload rejects invalid coordinates', () => {
  const result = validateMissionPayload({
    origin_lat: 132.7767,
    origin_lng: -96.797,
    dest_lat: 32.8998,
    dest_lng: -97.0403,
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /origin_lat/);
});

test('validateMissionPayload rejects unsupported priority', () => {
  const result = validateMissionPayload({
    origin_lat: 32.7767,
    origin_lng: -96.797,
    dest_lat: 32.8998,
    dest_lng: -97.0403,
    priority: 'critical',
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /priority/);
});
