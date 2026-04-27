const PRIORITY_LEVELS = new Set(['urgent', 'normal', 'low']);

function isValidCoordinate(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function validateMissionPayload(payload) {
  const originLat = Number(payload.origin_lat);
  const originLng = Number(payload.origin_lng);
  const destLat = Number(payload.dest_lat);
  const destLng = Number(payload.dest_lng);
  const priority = payload.priority || 'normal';

  if (!isValidCoordinate(originLat, -90, 90)) {
    return { valid: false, error: 'origin_lat must be a number between -90 and 90' };
  }

  if (!isValidCoordinate(originLng, -180, 180)) {
    return { valid: false, error: 'origin_lng must be a number between -180 and 180' };
  }

  if (!isValidCoordinate(destLat, -90, 90)) {
    return { valid: false, error: 'dest_lat must be a number between -90 and 90' };
  }

  if (!isValidCoordinate(destLng, -180, 180)) {
    return { valid: false, error: 'dest_lng must be a number between -180 and 180' };
  }

  if (!PRIORITY_LEVELS.has(priority)) {
    return { valid: false, error: "priority must be 'urgent', 'normal', or 'low'" };
  }

  return {
    valid: true,
    value: {
      originLat,
      originLng,
      destLat,
      destLng,
      cargoType: payload.cargo_type || null,
      priority,
    },
  };
}

module.exports = {
  validateMissionPayload,
};
