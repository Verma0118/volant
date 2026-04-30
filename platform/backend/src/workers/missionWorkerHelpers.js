const { haversineKm } = require('../services/assignmentEngine');
const { DEMO_MODE } = require('../config');

/** Higher than real eVTOL cruise so map missions finish in a watchable window. */
const DEFAULT_CRUISE_SPEED_KMPH = 220;
const MIN_FLIGHT_DURATION_MS = 2_500;
/** Long routes: cap so the worker + map leg finishes in under a minute (snappy dispatch UX). */
const MAX_FLIGHT_DURATION_MS = 42_000;
const DEMO_MAX_FLIGHT_DURATION_MS = 7_000;
/** Extra compression in demo so `npm run demo` stays brisk. */
const DEMO_FLIGHT_DURATION_SCALE = 0.55;

function estimateFlightDurationMs({
  originLat,
  originLng,
  destLat,
  destLng,
  cruiseSpeedKmph = DEFAULT_CRUISE_SPEED_KMPH,
}) {
  const distanceKm = haversineKm(originLat, originLng, destLat, destLng);
  const durationHours = distanceKm / cruiseSpeedKmph;
  let durationMs = durationHours * 60 * 60 * 1000;
  if (DEMO_MODE) {
    durationMs *= DEMO_FLIGHT_DURATION_SCALE;
  }
  const maxDurationMs = DEMO_MODE ? DEMO_MAX_FLIGHT_DURATION_MS : MAX_FLIGHT_DURATION_MS;

  return Math.max(MIN_FLIGHT_DURATION_MS, Math.min(maxDurationMs, durationMs));
}

function toMissionUpdatePayload(mission) {
  return {
    mission_id: mission.id,
    status: mission.status,
    aircraft_id: mission.aircraft_id,
    tail_number: mission.tail_number || null,
    priority: mission.priority,
    cargo_type: mission.cargo_type,
    conflict_reason: mission.conflict_reason,
    dispatched_at: mission.dispatched_at,
    assigned_at: mission.assigned_at,
    completed_at: mission.completed_at,
  };
}

module.exports = {
  DEFAULT_CRUISE_SPEED_KMPH,
  estimateFlightDurationMs,
  toMissionUpdatePayload,
};
