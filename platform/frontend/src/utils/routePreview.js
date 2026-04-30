/** Demo cruise speed for straight-line ETA (nautical miles per hour). */
export const DISPATCH_CRUISE_KTS = 85;

export function haversineNm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return km / 1.852;
}

export function estimateFlightMinutes(nm, cruiseKts = DISPATCH_CRUISE_KTS) {
  if (!Number.isFinite(nm) || nm <= 0 || !Number.isFinite(cruiseKts) || cruiseKts <= 0) {
    return null;
  }
  return (nm / cruiseKts) * 60;
}

export function formatDurationMinutes(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return '—';
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

export function parseRouteCoords(form) {
  const oLat = Number(form.origin_lat);
  const oLng = Number(form.origin_lng);
  const dLat = Number(form.dest_lat);
  const dLng = Number(form.dest_lng);
  if (![oLat, oLng, dLat, dLng].every(Number.isFinite)) return null;
  if (oLat < -90 || oLat > 90 || dLat < -90 || dLat > 90) return null;
  if (oLng < -180 || oLng > 180 || dLng < -180 || dLng > 180) return null;
  return { oLat, oLng, dLat, dLng };
}

/** Destination only — used when route preview starts from live aircraft position. */
export function parseDestinationCoords(form) {
  const dLat = Number(form.dest_lat);
  const dLng = Number(form.dest_lng);
  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) return null;
  if (dLat < -90 || dLat > 90 || dLng < -180 || dLng > 180) return null;
  return { dLat, dLng };
}
