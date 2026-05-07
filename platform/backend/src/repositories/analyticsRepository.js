const { pool } = require('../db');

const BATTERY_REPLACEMENT_CYCLES = 500;

async function getFleetSummary(operatorId) {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                                        AS total_missions,
       COALESCE(SUM(flight_duration_minutes), 0) / 60.0               AS total_flight_hours,
       COALESCE(AVG(flight_duration_minutes), 0)                       AS avg_duration_minutes,
       ROUND(
         COUNT(*) FILTER (WHERE laanc_status = 'authorized') * 100.0
         / NULLIF(COUNT(*), 0),
         1
       )                                                               AS laanc_auth_rate_pct
     FROM compliance_records
     WHERE operator_id = $1`,
    [operatorId]
  );
  return rows[0];
}

async function getAircraftUtilization(operatorId) {
  const { rows } = await pool.query(
    `SELECT
       a.id                                                                      AS aircraft_id,
       a.tail_number,
       a.model,
       a.type,
       ROUND(a.total_flight_minutes::numeric / 60, 2)                            AS flight_hours,
       a.battery_cycle_count,
       GREATEST(0, $2::int - a.battery_cycle_count)                              AS cycles_remaining,
       ROUND(LEAST(a.battery_cycle_count, $2::int)::numeric / $2::int * 100, 1) AS battery_used_pct,
       COUNT(cr.id)                                                              AS mission_count
     FROM aircraft a
     LEFT JOIN compliance_records cr
       ON cr.aircraft_id = a.id AND cr.operator_id = $1
     WHERE a.operator_id = $1
     GROUP BY a.id
     ORDER BY a.total_flight_minutes DESC`,
    [operatorId, BATTERY_REPLACEMENT_CYCLES]
  );
  return rows;
}

async function getMissionsByDay(operatorId) {
  const { rows } = await pool.query(
    `SELECT
       DATE(completed_at AT TIME ZONE 'UTC') AS day,
       COUNT(*)::int                          AS mission_count
     FROM compliance_records
     WHERE operator_id = $1
       AND completed_at >= now() - INTERVAL '30 days'
     GROUP BY day
     ORDER BY day ASC`,
    [operatorId]
  );
  return rows;
}

module.exports = { getFleetSummary, getAircraftUtilization, getMissionsByDay };
