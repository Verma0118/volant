const { pool } = require('../db');

const EARTH_RADIUS_NM = 3440.065;

// DFW Class B airspace anchor points (DFW + Love Field)
const CLASS_B_ANCHORS = [
  { lat: 32.8998, lng: -97.0403 }, // DFW International
  { lat: 32.8471, lng: -96.8517 }, // Dallas Love Field
];

function haversineNm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.asin(Math.sqrt(a));
}

function withinClassB(lat, lng) {
  return CLASS_B_ANCHORS.some((a) => haversineNm(lat, lng, a.lat, a.lng) <= 30);
}

function computeLaanc(missionId, originLat, originLng, destLat, destLng) {
  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (withinClassB(oLat, oLng) || withinClassB(dLat, dLng)) {
    return {
      laanc_status: 'authorized',
      laanc_auth_code: `LAANC-DFW-${missionId.slice(0, 8).toUpperCase()}`,
    };
  }
  return { laanc_status: 'not_required', laanc_auth_code: null };
}

function computeRegulation(aircraftType) {
  return aircraftType === 'evtol' ? 'part_135' : 'part_107';
}

async function createComplianceRecord({ missionId, operatorId, aircraftId, flightDurationMs }) {
  // Look up mission + aircraft in one query
  const { rows } = await pool.query(
    `SELECT
       m.origin_lat, m.origin_lng, m.dest_lat, m.dest_lng,
       m.cargo_type, m.priority, m.assigned_at, m.completed_at,
       a.tail_number, a.type AS aircraft_type
     FROM missions m
     JOIN aircraft a ON a.id = m.aircraft_id
     WHERE m.id = $1 AND m.operator_id = $2`,
    [missionId, operatorId]
  );

  if (!rows.length) {
    console.error(`complianceService: mission ${missionId} not found — skipping record`);
    return null;
  }

  const m = rows[0];
  const { laanc_status, laanc_auth_code } = computeLaanc(
    missionId,
    m.origin_lat, m.origin_lng,
    m.dest_lat, m.dest_lng
  );
  const regulation = computeRegulation(m.aircraft_type);
  const flightMinutes = flightDurationMs != null ? flightDurationMs / 1000 / 60 : null;

  const ins = await pool.query(
    `INSERT INTO compliance_records (
       operator_id, mission_id, aircraft_id, tail_number,
       origin_lat, origin_lng, dest_lat, dest_lng,
       departed_at, completed_at, flight_duration_minutes,
       cargo_type, priority, regulation, laanc_status, laanc_auth_code
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT (mission_id) DO NOTHING
     RETURNING *`,
    [
      operatorId, missionId, aircraftId, m.tail_number,
      m.origin_lat, m.origin_lng, m.dest_lat, m.dest_lng,
      m.assigned_at, m.completed_at, flightMinutes,
      m.cargo_type, m.priority, regulation, laanc_status, laanc_auth_code,
    ]
  );

  return ins.rows[0] || null;
}

module.exports = { createComplianceRecord };
