const test = require('node:test');
const assert = require('node:assert/strict');

const { sampleRoute, checkConflict } = require('./deconfliction');

test('sampleRoute returns origin and destination with estimated minutes', () => {
  const points = sampleRoute(32.7767, -96.797, 32.8998, -97.0403);

  assert.ok(points.length >= 2);
  assert.equal(points[0].lat, 32.7767);
  assert.equal(points[0].lng, -96.797);
  assert.equal(points[0].estimatedMinutes, 0);
  assert.equal(points[points.length - 1].lat, 32.8998);
  assert.equal(points[points.length - 1].lng, -97.0403);
});

test('checkConflict detects crossing routes in overlapping time windows', () => {
  const proposedMission = {
    id: 'proposed',
    origin_lat: 32.7700,
    origin_lng: -96.8100,
    dest_lat: 32.9000,
    dest_lng: -96.7000,
    dispatched_minute: 0,
  };

  const activeMissions = [
    {
      id: 'active-1',
      origin_lat: 32.9000,
      origin_lng: -96.8100,
      dest_lat: 32.7700,
      dest_lng: -96.7000,
      dispatched_minute: 1,
    },
  ];

  const result = checkConflict(proposedMission, activeMissions);

  assert.equal(result.conflict, true);
  assert.match(result.reason, /active-1/);
});

test('checkConflict ignores routes with safe spatial separation', () => {
  const proposedMission = {
    id: 'proposed',
    origin_lat: 32.7767,
    origin_lng: -96.797,
    dest_lat: 32.8998,
    dest_lng: -97.0403,
    dispatched_minute: 0,
  };

  const activeMissions = [
    {
      id: 'parallel-far',
      origin_lat: 32.7367,
      origin_lng: -96.977,
      dest_lat: 32.8598,
      dest_lng: -97.2203,
      dispatched_minute: 0,
    },
  ];

  const result = checkConflict(proposedMission, activeMissions);
  assert.deepEqual(result, { conflict: false, reason: null });
});

test('checkConflict ignores same corridor when time windows do not overlap', () => {
  const proposedMission = {
    id: 'proposed',
    origin_lat: 32.7767,
    origin_lng: -96.797,
    dest_lat: 32.8998,
    dest_lng: -97.0403,
    dispatched_minute: 0,
  };

  const activeMissions = [
    {
      id: 'same-route-later',
      origin_lat: 32.7767,
      origin_lng: -96.797,
      dest_lat: 32.8998,
      dest_lng: -97.0403,
      dispatched_minute: 40,
    },
  ];

  const result = checkConflict(proposedMission, activeMissions);
  assert.deepEqual(result, { conflict: false, reason: null });
});
