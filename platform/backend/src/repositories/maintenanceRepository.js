const { pool } = require('../db');

async function getMaintenanceSummary(operatorId) {
  const res = await pool.query(
    `SELECT
       a.id              AS aircraft_id,
       a.tail_number,
       a.model,
       a.total_flight_minutes,
       a.battery_cycle_count,
       a.last_maintenance_at,
       COUNT(md.id)      AS due_count
     FROM aircraft a
     LEFT JOIN maintenance_due md
       ON md.aircraft_id = a.id AND md.operator_id = $1
     WHERE a.operator_id = $1
     GROUP BY a.id
     ORDER BY a.tail_number`,
    [operatorId]
  );
  return res.rows;
}

async function getAircraftMaintenanceSummary(aircraftId, operatorId) {
  const res = await pool.query(
    `SELECT
       a.id              AS aircraft_id,
       a.tail_number,
       a.model,
       a.total_flight_minutes,
       a.battery_cycle_count,
       a.last_maintenance_at
     FROM aircraft a
     WHERE a.id = $1 AND a.operator_id = $2`,
    [aircraftId, operatorId]
  );
  return res.rows[0] || null;
}

async function listMaintenanceEvents(aircraftId, operatorId, limit = 50) {
  const res = await pool.query(
    `SELECT
       me.id, me.event_type, me.summary, me.details,
       me.performed_at, me.recorded_by, me.created_at
     FROM maintenance_events me
     WHERE me.aircraft_id = $1 AND me.operator_id = $2
     ORDER BY me.performed_at DESC
     LIMIT $3`,
    [aircraftId, operatorId, limit]
  );
  return res.rows;
}

async function createMaintenanceEvent({ aircraftId, operatorId, eventType, summary, details, performedAt, recordedBy }) {
  const res = await pool.query(
    `INSERT INTO maintenance_events
       (operator_id, aircraft_id, event_type, summary, details, performed_at, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [operatorId, aircraftId, eventType, summary, details || null, performedAt || new Date(), recordedBy || null]
  );

  if (eventType === 'scheduled' || eventType === 'inspection') {
    await pool.query(
      `UPDATE aircraft SET last_maintenance_at = $1 WHERE id = $2 AND operator_id = $3`,
      [performedAt || new Date(), aircraftId, operatorId]
    );
  }

  return res.rows[0];
}

async function listMaintenanceDue(aircraftId, operatorId) {
  const res = await pool.query(
    `SELECT id, kind, label, due_at, due_after_minutes, created_at
     FROM maintenance_due
     WHERE aircraft_id = $1 AND operator_id = $2
     ORDER BY created_at DESC`,
    [aircraftId, operatorId]
  );
  return res.rows;
}

async function createMaintenanceDue({ aircraftId, operatorId, kind, label, dueAt, dueAfterMinutes }) {
  const res = await pool.query(
    `INSERT INTO maintenance_due
       (operator_id, aircraft_id, kind, label, due_at, due_after_minutes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [operatorId, aircraftId, kind, label || null, dueAt || null, dueAfterMinutes || null]
  );
  return res.rows[0];
}

async function getBatteryHistory(aircraftId, operatorId, hours = 24) {
  const res = await pool.query(
    `SELECT
       time_bucket('5 minutes', recorded_at) AS bucket,
       round(avg(battery_pct)::numeric, 1)   AS avg_pct,
       min(battery_pct)                       AS min_pct,
       max(battery_pct)                       AS max_pct,
       mode() WITHIN GROUP (ORDER BY status)  AS dominant_status
     FROM battery_samples
     WHERE aircraft_id = $1
       AND operator_id = $2
       AND recorded_at > now() - ($3 || ' hours')::interval
     GROUP BY bucket
     ORDER BY bucket ASC`,
    [aircraftId, operatorId, hours]
  );
  return res.rows;
}

module.exports = {
  getMaintenanceSummary,
  getAircraftMaintenanceSummary,
  listMaintenanceEvents,
  createMaintenanceEvent,
  listMaintenanceDue,
  createMaintenanceDue,
  getBatteryHistory,
};
