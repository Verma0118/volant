const { connectPostgres, resolveOperator, pool } = require('../src/db');
const { getAircraft } = require('../src/repositories/aircraftRepository');
const { connectRedis, redis } = require('../src/redis');
const { DEMO_MODE } = require('../src/config');
const {
  MISSION_PATH_HASH,
  FORCE_STATUS_PREFIX,
} = require('../src/services/missionPathRedis');

const TELEMETRY_CHANNEL = 'telemetry:update';
const TICK_MS = 1000;
/** Lower = slower markers along routes (fraction of segment per tick). Tuned for map readability. */
const ROUTE_ADVANCE_EVTOL = 0.22 * 0.32;
const ROUTE_ADVANCE_DRONE = 0.38 * 0.32;
const CHARGE_RATE_PCT_PER_TICK = 0.85;

const DFW_CENTER = { lat: 32.7767, lng: -96.797 };

const EVTOL_ROUTES = [
  [
    { lat: 32.7767, lng: -96.797 }, // Downtown Dallas
    { lat: 32.8998, lng: -97.0403 }, // DFW Airport
    { lat: 32.8444, lng: -96.8518 }, // Love Field
    { lat: 32.7767, lng: -96.797 },
  ],
  [
    { lat: 32.786, lng: -96.8022 },
    { lat: 32.952, lng: -96.8365 }, // Addison
    { lat: 32.8998, lng: -97.0403 },
    { lat: 32.786, lng: -96.8022 },
  ],
];

const DRONE_ROUTES = [
  [
    { lat: 32.9057, lng: -97.0377 }, // North of DFW
    { lat: 32.9125, lng: -97.0121 },
    { lat: 32.8972, lng: -96.9978 },
    { lat: 32.9057, lng: -97.0377 },
  ],
  [
    { lat: 32.8121, lng: -96.7531 }, // Industrial east loop
    { lat: 32.8213, lng: -96.7332 },
    { lat: 32.7998, lng: -96.7267 },
    { lat: 32.8121, lng: -96.7531 },
  ],
];

const DEMO_STATUS_BY_TAIL = {
  N301VL: 'in-flight',
  N302VL: 'in-flight',
  N303VL: 'in-flight',
  N304VL: 'in-flight',
  N305VL: 'charging',
  N306VL: 'maintenance',
  N307VL: 'grounded',
  N308VL: 'charging',
  N309VL: 'ready',
  N310VL: 'ready',
};

const DEMO_START_BATTERY_BY_TAIL = {
  N301VL: 74,
  N302VL: 66,
  N303VL: 59,
  N304VL: 30,
  N305VL: 34,
  N306VL: 63,
  N307VL: 12,
  N308VL: 33,
  N309VL: 92,
  N310VL: 88,
};

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function bearingDegrees(a, b) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const dLng = toRadians(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const heading = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((heading + 360) % 360);
}

function interpolate(a, b, t) {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sampleRandom(min, max) {
  return min + Math.random() * (max - min);
}

function createAircraftState(aircraft, index) {
  const routeFamily = aircraft.type === 'evtol' ? EVTOL_ROUTES : DRONE_ROUTES;
  const baseRoute = routeFamily[index % routeFamily.length];
  const route = [...baseRoute];
  const status = DEMO_MODE
    ? DEMO_STATUS_BY_TAIL[aircraft.tail_number] || 'ready'
    : ['in-flight', 'charging', 'ready'][index % 3];

  const startPoint = route[0] || DFW_CENTER;
  const nextPoint = route[1] || startPoint;
  const defaultAltitude = aircraft.type === 'evtol' ? 1200 : 260;
  const defaultSpeed = aircraft.type === 'evtol' ? 110 : 38;

  const batteryByStatus = {
    'in-flight': sampleRandom(45, 85),
    charging: sampleRandom(12, 40),
    maintenance: sampleRandom(55, 75),
    grounded: sampleRandom(5, 18),
    ready: sampleRandom(82, 100),
  };

  const batteryPct = DEMO_MODE
    ? DEMO_START_BATTERY_BY_TAIL[aircraft.tail_number] ?? sampleRandom(40, 80)
    : batteryByStatus[status] ?? sampleRandom(40, 80);

  return {
    ...aircraft,
    route,
    routeIndex: 0,
    routeProgress: 0,
    lat: startPoint.lat,
    lng: startPoint.lng,
    heading_deg: bearingDegrees(startPoint, nextPoint),
    altitude_ft:
      status === 'in-flight'
        ? defaultAltitude
        : status === 'charging' || status === 'ready'
          ? 0
          : Math.round(defaultAltitude * 0.15),
    speed_kts: status === 'in-flight' ? defaultSpeed : 0,
    battery_pct: batteryPct,
    battery_float: batteryPct,
    status,
    holdTicks: 0,
  };
}

function moveAlongRoute(state) {
  const current = state.route[state.routeIndex];
  const next = state.route[(state.routeIndex + 1) % state.route.length];

  const speedFactor = state.type === 'evtol' ? ROUTE_ADVANCE_EVTOL : ROUTE_ADVANCE_DRONE;
  const nextProgress = state.routeProgress + speedFactor;

  if (nextProgress >= 1) {
    state.routeIndex = (state.routeIndex + 1) % state.route.length;
    state.routeProgress = 0;
    state.lat = next.lat;
    state.lng = next.lng;
    const future = state.route[(state.routeIndex + 1) % state.route.length];
    state.heading_deg = bearingDegrees(next, future);
    return true;
  }

  state.routeProgress = nextProgress;
  const point = interpolate(current, next, nextProgress);
  state.lat = point.lat;
  state.lng = point.lng;
  state.heading_deg = bearingDegrees(current, next);
  return false;
}

function updateDynamicState(state) {
  if (state.status === 'maintenance' || state.status === 'grounded') {
    state.speed_kts = 0;
    state.altitude_ft = 0;
    return;
  }

  if (state.status === 'charging') {
    state.speed_kts = 0;
    state.altitude_ft = 0;
    state.battery_float = clamp(
      (state.battery_float ?? state.battery_pct) + CHARGE_RATE_PCT_PER_TICK,
      0,
      100
    );
    state.battery_pct = state.battery_float;
    if (state.battery_pct >= 85) {
      state.status = 'ready';
    }
    return;
  }

  if (state.status === 'ready') {
    state.speed_kts = 0;
    state.altitude_ft = 0;
    state.holdTicks += 1;
    if (state.holdTicks >= 5) {
      state.holdTicks = 0;
      state.status = 'in-flight';
      state.speed_kts = state.type === 'evtol' ? 110 : 38;
      state.altitude_ft = state.type === 'evtol' ? 1200 : 260;
    }
    return;
  }

  const waypointReached = moveAlongRoute(state);
  state.speed_kts = state.type === 'evtol' ? 110 : 38;
  state.altitude_ft = state.type === 'evtol' ? 1200 : 260;
  state.battery_float = clamp(
    (state.battery_float ?? state.battery_pct) - sampleRandom(0.3, 0.55),
    0,
    100
  );
  state.battery_pct = state.battery_float;

  if (state.battery_pct <= 20) {
    state.status = 'charging';
    state.speed_kts = 0;
    state.altitude_ft = 0;
    return;
  }

  if (waypointReached && state.battery_pct <= 30) {
    state.status = 'charging';
    state.speed_kts = 0;
    state.altitude_ft = 0;
  }
}

const demoEvents = {
  transition30sLogged: false,
  transition60sLogged: false,
};

/**
 * Active mission: fly in a straight line (lat/lng lerp) from worker-provided
 * start → dest, matching the map "blue line" instead of the leisure loop route.
 */
function applyMissionPathInterpolation(state, g) {
  const elapsed = Date.now() - Number(g.startMs);
  const duration = Math.max(1, Number(g.durationMs));
  const t = Math.min(1, Math.max(0, elapsed / duration));

  const endLat = Number(g.endLat);
  const endLng = Number(g.endLng);
  const startLat = Number(g.startLat);
  const startLng = Number(g.startLng);

  state.lat = startLat + (endLat - startLat) * t;
  state.lng = startLng + (endLng - startLng) * t;
  const here = { lat: state.lat, lng: state.lng };
  const dest = { lat: endLat, lng: endLng };
  state.heading_deg = bearingDegrees(here, dest);
  state.status = 'in-flight';
  state.speed_kts = state.type === 'evtol' ? 110 : 38;
  state.altitude_ft = state.type === 'evtol' ? 1200 : 260;
  state.battery_float = clamp(
    (state.battery_float ?? state.battery_pct) - sampleRandom(0.3, 0.55),
    0,
    100
  );
  state.battery_pct = state.battery_float;
}

function applyDemoScenarioOverrides(state, demoTick) {
  if (state.tail_number === 'N304VL' && demoTick >= 30) {
    if (demoTick === 30 && !demoEvents.transition30sLogged) {
      console.log('Demo event T+30s: N304VL landed and entered charging at 18%');
      demoEvents.transition30sLogged = true;
    }

    state.status = 'charging';
    state.speed_kts = 0;
    state.altitude_ft = 0;
    state.battery_pct = clamp(Math.max(state.battery_pct, 18), 0, 100);
  }

  if (state.tail_number === 'N308VL' && demoTick <= 60) {
    const demoBattery = clamp(33 + demoTick * 0.8, 0, 81);
    state.battery_pct = demoBattery;
    state.speed_kts = 0;
    state.altitude_ft = 0;

    if (demoTick < 60) {
      state.status = 'charging';
      return;
    }

    state.status = 'ready';
    state.holdTicks = 0;

    if (!demoEvents.transition60sLogged) {
      console.log('Demo event T+60s: N308VL reached 81% and is now ready');
      demoEvents.transition60sLogged = true;
    }
  }
}

function buildPayload(state) {
  return {
    aircraft_id: state.id,
    tail_number: state.tail_number,
    lat: Number(state.lat.toFixed(6)),
    lng: Number(state.lng.toFixed(6)),
    altitude_ft: Math.round(state.altitude_ft),
    speed_kts: Math.round(state.speed_kts),
    heading_deg: Math.round(state.heading_deg),
    battery_pct: Math.min(100, Math.round(Number(state.battery_pct) || 0)),
    status: state.status,
    timestamp: new Date().toISOString(),
  };
}

let demoTick = 0;

async function tick(states) {
  let pathById = {};
  try {
    pathById = await redis.hGetAll(MISSION_PATH_HASH);
  } catch (err) {
    console.error('mission:path hGetAll failed', err.message);
  }

  const forceKeys = states.map((s) => `${FORCE_STATUS_PREFIX}${s.id}`);
  let forceVals = [];
  try {
    if (forceKeys.length) {
      forceVals = await redis.mGet(forceKeys);
    }
  } catch (err) {
    console.error('aircraft:forceStatus mGet failed', err.message);
  }

  for (let i = 0; i < states.length; i += 1) {
    const state = states[i];
    const force = forceVals[i];
    if (force) {
      try {
        await redis.del(`${FORCE_STATUS_PREFIX}${state.id}`);
      } catch {
        /* ignore */
      }
      state.status = force;
      state.speed_kts = 0;
      state.altitude_ft = 0;
    }

    const rawPath = pathById[String(state.id)];
    if (rawPath) {
      try {
        const g = JSON.parse(rawPath);
        applyMissionPathInterpolation(state, g);
      } catch (err) {
        console.error(`mission:path parse failed for ${state.id}`, err.message);
        updateDynamicState(state);
        if (DEMO_MODE) {
          applyDemoScenarioOverrides(state, demoTick);
        }
      }
    } else {
      updateDynamicState(state);
      if (DEMO_MODE) {
        applyDemoScenarioOverrides(state, demoTick);
      }
    }

    state.battery_float = clamp(Number(state.battery_pct), 0, 100);
    state.battery_pct = state.battery_float;
    const payload = buildPayload(state);
    await redis.publish(TELEMETRY_CHANNEL, JSON.stringify(payload));
  }

  if (DEMO_MODE) {
    demoTick += 1;
  }
}

async function main() {
  await connectPostgres();
  await resolveOperator();
  await connectRedis();

  const operatorId = process.env.CURRENT_OPERATOR_ID;
  if (!operatorId) {
    throw new Error('CURRENT_OPERATOR_ID not set. Run migrations before simulator.');
  }

  const aircraft = await getAircraft(operatorId);
  if (!aircraft.length) {
    throw new Error('No aircraft found. Run `npm run seed` before simulator.');
  }

  const states = aircraft
    .sort((a, b) => a.tail_number.localeCompare(b.tail_number))
    .map((row, index) => createAircraftState(row, index));

  console.log(
    `Telemetry simulator started (${DEMO_MODE ? 'DEMO_MODE=true' : 'DEMO_MODE=false'})`
  );
  console.log(`Publishing ${states.length} aircraft to Redis channel ${TELEMETRY_CHANNEL}`);

  await tick(states);
  setInterval(() => {
    tick(states).catch((err) => {
      console.error('Telemetry tick failed', err);
    });
  }, TICK_MS);
}

main().catch(async (err) => {
  console.error('Telemetry simulator failed to start', err);
  await pool.end();
  process.exit(1);
});
