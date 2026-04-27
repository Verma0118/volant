const { haversineKm } = require('./assignmentEngine');

const DEFAULT_STEP_KM = 0.5;
const CONFLICT_DISTANCE_KM = 0.5;
const TIME_WINDOW_MINUTES = 2;
const DEFAULT_CRUISE_SPEED_KMPH = 120;

function sampleRoute(
  originLat,
  originLng,
  destLat,
  destLng,
  stepKm = DEFAULT_STEP_KM,
  cruiseSpeedKmph = DEFAULT_CRUISE_SPEED_KMPH
) {
  const totalDistanceKm = haversineKm(originLat, originLng, destLat, destLng);
  const segments = Math.max(1, Math.ceil(totalDistanceKm / stepKm));
  const totalMinutes = (totalDistanceKm / cruiseSpeedKmph) * 60;

  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    points.push({
      lat: originLat + (destLat - originLat) * t,
      lng: originLng + (destLng - originLng) * t,
      estimatedMinutes: totalMinutes * t,
    });
  }

  return points;
}

function checkConflict(proposedMission, activeMissions) {
  const proposedCruiseSpeed =
    proposedMission.cruise_speed_kmph || DEFAULT_CRUISE_SPEED_KMPH;
  const proposedPoints = sampleRoute(
    proposedMission.origin_lat,
    proposedMission.origin_lng,
    proposedMission.dest_lat,
    proposedMission.dest_lng,
    DEFAULT_STEP_KM,
    proposedCruiseSpeed
  );
  const proposedDispatchMinute = proposedMission.dispatched_minute || 0;

  for (const mission of activeMissions) {
    const missionCruiseSpeed =
      mission.cruise_speed_kmph || DEFAULT_CRUISE_SPEED_KMPH;
    const missionPoints = sampleRoute(
      mission.origin_lat,
      mission.origin_lng,
      mission.dest_lat,
      mission.dest_lng,
      DEFAULT_STEP_KM,
      missionCruiseSpeed
    );
    const missionDispatchMinute = mission.dispatched_minute || 0;

    for (const proposedPoint of proposedPoints) {
      for (const missionPoint of missionPoints) {
        const distanceKm = haversineKm(
          proposedPoint.lat,
          proposedPoint.lng,
          missionPoint.lat,
          missionPoint.lng
        );
        const proposedTime = proposedDispatchMinute + proposedPoint.estimatedMinutes;
        const missionTime = missionDispatchMinute + missionPoint.estimatedMinutes;
        const timeDeltaMinutes = Math.abs(proposedTime - missionTime);

        if (
          distanceKm <= CONFLICT_DISTANCE_KM &&
          timeDeltaMinutes <= TIME_WINDOW_MINUTES
        ) {
          return {
            conflict: true,
            reason: `Conflict with mission ${mission.id || 'unknown'} at ${distanceKm.toFixed(
              2
            )}km and ${timeDeltaMinutes.toFixed(1)}min delta`,
          };
        }
      }
    }
  }

  return { conflict: false, reason: null };
}

module.exports = {
  sampleRoute,
  checkConflict,
  DEFAULT_STEP_KM,
  CONFLICT_DISTANCE_KM,
  TIME_WINDOW_MINUTES,
};
