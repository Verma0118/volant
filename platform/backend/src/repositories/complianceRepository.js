const { pool } = require('../db');

async function listCompliance(operatorId, { regulation, laanc_status, limit = 100 } = {}) {
  const conditions = ['operator_id = $1'];
  const params = [operatorId];
  let idx = 2;

  if (regulation) {
    conditions.push(`regulation = $${idx++}`);
    params.push(regulation);
  }
  if (laanc_status) {
    conditions.push(`laanc_status = $${idx++}`);
    params.push(laanc_status);
  }

  const cap = Math.min(Number(limit) || 100, 500);
  params.push(cap);

  const { rows } = await pool.query(
    `SELECT
       id, mission_id, aircraft_id, tail_number, record_type,
       origin_lat, origin_lng, dest_lat, dest_lng,
       departed_at, completed_at, flight_duration_minutes,
       cargo_type, priority, regulation, laanc_status, laanc_auth_code, created_at
     FROM compliance_records
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx}`,
    params
  );
  return rows;
}

async function getComplianceById(id, operatorId) {
  const { rows } = await pool.query(
    `SELECT * FROM compliance_records WHERE id = $1 AND operator_id = $2`,
    [id, operatorId]
  );
  return rows[0] || null;
}

// Streams CSV rows directly to an Express response
async function streamComplianceCsv(operatorId, res) {
  const { rows } = await pool.query(
    `SELECT
       id, mission_id, tail_number, record_type,
       origin_lat, origin_lng, dest_lat, dest_lng,
       departed_at, completed_at, flight_duration_minutes,
       cargo_type, priority, regulation, laanc_status, laanc_auth_code, created_at
     FROM compliance_records
     WHERE operator_id = $1
     ORDER BY created_at DESC`,
    [operatorId]
  );

  const headers = [
    'id', 'mission_id', 'tail_number', 'record_type',
    'origin_lat', 'origin_lng', 'dest_lat', 'dest_lng',
    'departed_at', 'completed_at', 'flight_duration_minutes',
    'cargo_type', 'priority', 'regulation', 'laanc_status', 'laanc_auth_code', 'created_at',
  ];

  const TIMESTAMP_COLS = new Set(['departed_at', 'completed_at', 'created_at']);

  res.write(headers.join(',') + '\n');

  for (const row of rows) {
    const line = headers
      .map((h) => {
        const v = row[h];
        if (v == null) return '';
        const s = TIMESTAMP_COLS.has(h) && v instanceof Date
          ? v.toISOString()
          : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(',');
    res.write(line + '\n');
  }
}

module.exports = { listCompliance, getComplianceById, streamComplianceCsv };
