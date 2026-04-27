const { redis } = require('../redis');

const MISSION_PATH_HASH = 'mission:path';
const FORCE_STATUS_PREFIX = 'aircraft:forceStatus:';

/**
 * @param {string} aircraftId
 * @param {{ startLat: number, startLng: number, endLat: number, endLng: number, startMs: number, durationMs: number }} spec
 */
async function setMissionPath(aircraftId, spec) {
  if (!aircraftId || !spec) {
    return;
  }
  await redis.hSet(MISSION_PATH_HASH, aircraftId, JSON.stringify(spec));
}

/** Clear path + (optional) ask simulator to pick up status on next tick (separate process). */
async function clearMissionPath(aircraftId, nextStatus) {
  if (!aircraftId) {
    return;
  }
  await redis.hDel(MISSION_PATH_HASH, aircraftId);
  if (nextStatus) {
    await redis.set(`${FORCE_STATUS_PREFIX}${aircraftId}`, nextStatus, { EX: 15 });
  }
}

module.exports = {
  FORCE_STATUS_PREFIX,
  MISSION_PATH_HASH,
  setMissionPath,
  clearMissionPath,
};
