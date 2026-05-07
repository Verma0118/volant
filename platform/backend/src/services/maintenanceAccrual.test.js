const test = require('node:test');
const assert = require('node:assert/strict');

const { accrueFlightMinutes } = require('./maintenanceAccrual');

function makeMockPool(maintenanceMinutesApplied) {
  const queries = [];
  const client = {
    queries,
    query: async (sql, params) => {
      queries.push({ sql: sql.trim(), params });
      if (sql.includes('FOR UPDATE')) {
        if (maintenanceMinutesApplied === null) return { rows: [] };
        return { rows: [{ maintenance_minutes_applied: maintenanceMinutesApplied }] };
      }
      return { rows: [] };
    },
    release: () => {},
  };
  return { connect: async () => client, _client: client };
}

test('accrueFlightMinutes adds correct minutes to aircraft', async () => {
  const pool = makeMockPool(false);

  await accrueFlightMinutes(
    { missionId: 'm1', operatorId: 'op1', aircraftId: 'ac1', flightDurationMs: 120_000 },
    pool
  );

  const updateAircraft = pool._client.queries.find((q) =>
    q.sql.includes('UPDATE aircraft')
  );
  assert.ok(updateAircraft, 'aircraft UPDATE should be issued');
  assert.equal(updateAircraft.params[0], 2, '120_000ms = 2 minutes');
  assert.equal(updateAircraft.params[1], 'ac1');
  assert.equal(updateAircraft.params[2], 'op1');
});

test('accrueFlightMinutes marks mission as applied', async () => {
  const pool = makeMockPool(false);

  await accrueFlightMinutes(
    { missionId: 'm1', operatorId: 'op1', aircraftId: 'ac1', flightDurationMs: 60_000 },
    pool
  );

  const updateMission = pool._client.queries.find((q) =>
    q.sql.includes('UPDATE missions')
  );
  assert.ok(updateMission, 'missions UPDATE should be issued');
  assert.equal(updateMission.params[0], 'm1');
});

test('accrueFlightMinutes is idempotent — skips if already applied', async () => {
  const pool = makeMockPool(true);

  await accrueFlightMinutes(
    { missionId: 'm1', operatorId: 'op1', aircraftId: 'ac1', flightDurationMs: 60_000 },
    pool
  );

  const updateAircraft = pool._client.queries.find((q) =>
    q.sql.includes('UPDATE aircraft')
  );
  assert.equal(updateAircraft, undefined, 'should not update aircraft when already applied');
});

test('accrueFlightMinutes is idempotent — skips if mission not found', async () => {
  const pool = makeMockPool(null);

  await accrueFlightMinutes(
    { missionId: 'missing', operatorId: 'op1', aircraftId: 'ac1', flightDurationMs: 60_000 },
    pool
  );

  const updateAircraft = pool._client.queries.find((q) =>
    q.sql.includes('UPDATE aircraft')
  );
  assert.equal(updateAircraft, undefined, 'should not update aircraft when mission not found');
});
