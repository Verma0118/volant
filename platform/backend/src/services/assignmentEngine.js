const { fleetState } = require('./fleetMap');

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function selectAircraft(originLat, originLng) {
  const candidates = Object.values(fleetState).filter(
    (aircraft) =>
      aircraft &&
      aircraft.status === 'ready' &&
      Number.isFinite(aircraft.battery_pct) &&
      aircraft.battery_pct >= 40 &&
      Number.isFinite(aircraft.lat) &&
      Number.isFinite(aircraft.lng)
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, current) => {
    const currentDistance = haversineKm(
      originLat,
      originLng,
      current.lat,
      current.lng
    );
    const bestDistance = haversineKm(originLat, originLng, best.lat, best.lng);

    return currentDistance < bestDistance ? current : best;
  });
}

module.exports = {
  haversineKm,
  selectAircraft,
};
