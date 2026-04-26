const { createClient } = require('redis');

const { getIO } = require('../socket');
const { REDIS_URL } = require('../config');

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
