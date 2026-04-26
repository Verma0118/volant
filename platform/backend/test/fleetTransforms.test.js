const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeWithLiveState } = require('../src/utils/fleetTransforms');

test('mergeWithLiveState preserves registry fields and injects telemetry', () => {
  const aircraft = {
    id: 'a1',
    tail_number: 'N301VL',
    type: 'evtol',
    model: 'Midnight',
    operator: 'Archer Aviation',
  };

  const fleetState = {
    a1: {
      lat: 32.9,
      lng: -97.0,
      altitude_ft: 1200,
      speed_kts: 110,
      heading_deg: 47,
      battery_pct: 74,
      status: 'in-flight',
      timestamp: '2026-01-01T00:00:00.000Z',
    },
  };

  const merged = mergeWithLiveState(aircraft, fleetState);

  assert.equal(merged.tail_number, 'N301VL');
  assert.equal(merged.operator, 'Archer Aviation');
  assert.equal(merged.lat, 32.9);
  assert.equal(merged.status, 'in-flight');
  assert.equal(merged.last_update, '2026-01-01T00:00:00.000Z');
});

test('mergeWithLiveState returns safe null/unknown defaults when telemetry is missing', () => {
  const aircraft = {
    id: 'missing-live',
    tail_number: 'N999VL',
    type: 'drone',
    model: 'Matrice 300 RTK',
    operator: 'DFW Inspection Co',
  };

  const merged = mergeWithLiveState(aircraft, {});

  assert.equal(merged.lat, null);
  assert.equal(merged.lng, null);
  assert.equal(merged.battery_pct, null);
  assert.equal(merged.status, 'unknown');
  assert.equal(merged.last_update, null);
});
