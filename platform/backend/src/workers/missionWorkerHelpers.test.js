const test = require('node:test');
const assert = require('node:assert/strict');

const {
  estimateFlightDurationMs,
  toMissionUpdatePayload,
} = require('./missionWorkerHelpers');

test('estimateFlightDurationMs clamps to minimum for very short routes', () => {
  const duration = estimateFlightDurationMs({
    originLat: 32.7767,
    originLng: -96.797,
    destLat: 32.7768,
    destLng: -96.7971,
  });

  assert.equal(duration, 5000);
});

test('estimateFlightDurationMs scales with route distance', () => {
  const duration = estimateFlightDurationMs({
    originLat: 32.7767,
    originLng: -96.797,
    destLat: 32.8998,
    destLng: -97.0403,
  });

  assert.ok(duration >= 5000);
  assert.ok(duration <= 180000);
});

test('toMissionUpdatePayload returns socket-safe mission status payload', () => {
  const payload = toMissionUpdatePayload({
    id: 'mission-1',
    status: 'in-flight',
    aircraft_id: 'aircraft-1',
    tail_number: 'N308VL',
    priority: 'urgent',
    cargo_type: 'medical',
    conflict_reason: null,
    dispatched_at: '2026-04-27T00:00:00.000Z',
    assigned_at: '2026-04-27T00:01:00.000Z',
    completed_at: null,
  });

  assert.deepEqual(payload, {
    mission_id: 'mission-1',
    status: 'in-flight',
    aircraft_id: 'aircraft-1',
    tail_number: 'N308VL',
    priority: 'urgent',
    cargo_type: 'medical',
    conflict_reason: null,
    dispatched_at: '2026-04-27T00:00:00.000Z',
    assigned_at: '2026-04-27T00:01:00.000Z',
    completed_at: null,
  });
});
