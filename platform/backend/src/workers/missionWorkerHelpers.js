const { haversineKm } = require('../services/assignmentEngine');
const { DEMO_MODE } = require('../config');

/** Demo missions use a modest cruise so legs are visible but not instant. */
const DEFAULT_CRUISE_SPEED_KMPH = 220;
const MIN_FLIGHT_DURATION_MS = 2_500;
/** Long routes: cap so prod missions do not block the worker unreasonably. */
const MAX_FLIGHT_DURATION_MS = 42_000;
/** Demo: long enough to follow on the map; short enough for investor loops. */
const DEMO_MIN_FLIGHT_DURATION_MS = 14_000;
const DEMO_MAX_FLIGHT_DURATION_MS = 72_000;
/** Slight compression vs raw physics; pair with DEMO_MIN so short hops are not ~2s. */
const DEMO_FLIGHT_DURATION_SCALE = 0.82;

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
  const minDurationMs = DEMO_MODE ? DEMO_MIN_FLIGHT_DURATION_MS : MIN_FLIGHT_DURATION_MS;

  return Math.max(minDurationMs, Math.min(maxDurationMs, durationMs));
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
