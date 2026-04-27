const test = require('node:test');
const assert = require('node:assert/strict');

const { fleetState } = require('./fleetMap');
const { haversineKm, selectAircraft } = require('./assignmentEngine');

function resetFleetState() {
  for (const key of Object.keys(fleetState)) {
    delete fleetState[key];
  }
}

test('haversineKm returns 0 for identical coordinates', () => {
  assert.equal(haversineKm(32.7767, -96.797, 32.7767, -96.797), 0);
});

test('selectAircraft chooses nearest ready aircraft with battery >= 40', () => {
  resetFleetState();

  fleetState.a1 = {
    aircraft_id: 'a1',
    tail_number: 'N301VL',
    status: 'ready',
    battery_pct: 60,
    lat: 32.7801,
    lng: -96.8001,
  };
  fleetState.a2 = {
    aircraft_id: 'a2',
    tail_number: 'N302VL',
    status: 'ready',
    battery_pct: 90,
    lat: 32.95,
    lng: -97.02,
  };
  fleetState.a3 = {
    aircraft_id: 'a3',
    tail_number: 'N303VL',
    status: 'ready',
    battery_pct: 35,
    lat: 32.7768,
    lng: -96.7971,
  };

  const selected = selectAircraft(32.7767, -96.797);

  assert.ok(selected);
  assert.equal(selected.aircraft_id, 'a1');
  assert.equal(selected.tail_number, 'N301VL');

  resetFleetState();
});

test('selectAircraft returns null when there are no eligible candidates', () => {
  resetFleetState();

  fleetState.a1 = {
    aircraft_id: 'a1',
    status: 'charging',
    battery_pct: 55,
    lat: 32.78,
    lng: -96.8,
  };
  fleetState.a2 = {
    aircraft_id: 'a2',
    status: 'ready',
    battery_pct: 15,
    lat: 32.779,
    lng: -96.801,
  };

  const selected = selectAircraft(32.7767, -96.797);
  assert.equal(selected, null);

  resetFleetState();
});

test('selectAircraft allows high-SoC charging aircraft as dispatch-eligible', () => {
  resetFleetState();

  fleetState.a1 = {
    aircraft_id: 'a1',
    tail_number: 'N901VL',
    status: 'charging',
    battery_pct: 88,
    lat: 32.7768,
    lng: -96.7975,
  };
  fleetState.a2 = {
    aircraft_id: 'a2',
    tail_number: 'N902VL',
    status: 'charging',
    battery_pct: 88,
    lat: 32.99,
    lng: -97.5,
  };

  const selected = selectAircraft(32.7767, -96.797);
  assert.ok(selected);
  assert.equal(selected.aircraft_id, 'a1');

  resetFleetState();
});
