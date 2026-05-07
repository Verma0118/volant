const { createClient } = require('redis');

const { getIO } = require('../socket');
const { REDIS_URL } = require('../config');
const { getAircraft } = require('../repositories/aircraftRepository');
const { recordBatterySample } = require('./batteryHistoryService');

const TELEMETRY_CHANNEL = 'telemetry:update';
const FLEET_STATE_KEY = 'fleet:state';

const fleetState = {};

let subClient;
let writerClient;
let fleetMapStarted = false;

async function hydrateFromRedis(redisClient) {
  const snapshot = await redisClient.hGetAll(FLEET_STATE_KEY);

  for (const [id, raw] of Object.entries(snapshot)) {
    try {
      fleetState[id] = JSON.parse(raw);
    } catch (err) {
      console.error(`Failed to parse fleet state for ${id}`, err);
    }
  }

  console.log(`Fleet hydrated: ${Object.keys(fleetState).length} aircraft`);
}

/**
 * Redis fleet:state persists across DB re-seeds. Old aircraft_id keys stay in the hash
 * while new registry rows get new UUIDs — simulator only publishes for current IDs,
 * leaving stale duplicates (same tail_number, ancient timestamp). Drop orphans.
 */
async function pruneFleetStateToRegistry(redisClient, operatorId) {
  if (!operatorId) {
    console.warn('Fleet prune skipped: CURRENT_OPERATOR_ID not set');
    return;
  }

  let rows;
  try {
    rows = await getAircraft(operatorId);
  } catch (err) {
    console.error('Fleet prune: failed to load aircraft registry', err.message);
    return;
  }

  const allowed = new Set(rows.map((row) => String(row.id)));
  let removed = 0;

  for (const id of Object.keys(fleetState)) {
    if (!allowed.has(id)) {
      delete fleetState[id];
      await redisClient.hDel(FLEET_STATE_KEY, id);
      removed += 1;
    }
  }

  if (removed > 0) {
    console.log(`Fleet pruned ${removed} stale Redis aircraft key(s) not in registry`);
  }
}

async function startFleetMap() {
  if (fleetMapStarted) {
    return;
  }

  subClient = createClient({ url: REDIS_URL });
  writerClient = createClient({ url: REDIS_URL });

  subClient.on('error', (err) => {
    console.error('FleetMap subscriber Redis error', err);
  });

  writerClient.on('error', (err) => {
    console.error('FleetMap writer Redis error', err);
  });

  await subClient.connect();
  await writerClient.connect();

  await hydrateFromRedis(writerClient);
  await pruneFleetStateToRegistry(writerClient, process.env.CURRENT_OPERATOR_ID);

  getIO().on('connection', (socket) => {
    socket.emit('fleet:snapshot', fleetState);
  });

  await subClient.subscribe(TELEMETRY_CHANNEL, async (message) => {
    try {
      const payload = JSON.parse(message);
      const id = payload.aircraft_id;

      if (!id) {
        return;
      }

      fleetState[id] = payload;
      await writerClient.hSet(FLEET_STATE_KEY, id, JSON.stringify(payload));
      getIO().emit('aircraft:update', payload);

      const operatorId = process.env.CURRENT_OPERATOR_ID;
      if (operatorId && payload.battery_pct != null) {
        recordBatterySample({
          aircraftId: id,
          operatorId,
          batteryPct: payload.battery_pct,
          status: payload.status,
        });
      }
    } catch (err) {
      console.error('FleetMap telemetry processing error', err);
    }
  });

  fleetMapStarted = true;
  console.log('Fleet Map Service started — subscribed to telemetry:update');
}

module.exports = {
  startFleetMap,
  fleetState,
};
