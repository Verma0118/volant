const { pool } = require('../db');

async function createMission({
  operatorId,
  aircraftId,
  originLat,
  originLng,
  destLat,
  destLng,
  cargoType,
  priority,
  status,
  conflictReason,
  assignedAt,
}) {
  const result = await pool.query(
    `INSERT INTO missions (
      operator_id,
      aircraft_id,
      origin_lat,
      origin_lng,
      dest_lat,
      dest_lng,
      cargo_type,
      priority,
      status,
      conflict_reason,
      assigned_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      operatorId,
      aircraftId,
      originLat,
      originLng,
      destLat,
      destLng,
      cargoType || null,
      priority || 'normal',
      status || 'queued',
      conflictReason || null,
      assignedAt || null,
    ]
  );

  return result.rows[0];
}

async function listMissions(operatorId) {
  const result = await pool.query(
    `SELECT
       m.*,
       a.tail_number
     FROM missions m
     LEFT JOIN aircraft a ON a.id = m.aircraft_id
     WHERE m.operator_id = $1
     ORDER BY m.dispatched_at DESC`,
    [operatorId]
  );
  return result.rows;
}

async function listActiveMissions(operatorId) {
  const result = await pool.query(
    `SELECT * FROM missions
     WHERE operator_id = $1
       AND status IN ('assigned', 'in-flight')
     ORDER BY dispatched_at DESC`,
    [operatorId]
  );
  return result.rows;
}

async function getMissionById(id, operatorId) {
  const result = await pool.query(
    `SELECT
       m.*,
       a.tail_number,
       a.type AS aircraft_type,
       a.model AS aircraft_model,
       a.operator AS aircraft_operator
     FROM missions m
     LEFT JOIN aircraft a ON a.id = m.aircraft_id
     WHERE m.id = $1 AND m.operator_id = $2
     LIMIT 1`,
    [id, operatorId]
  );

  return result.rows[0] || null;
}

/**
 * Internal use only — worker context, no user input reaches this.
 * Routes must use getMissionById(id, operatorId) for operator-scoped access.
 */
async function getMissionByIdAnyOperator(id) {
  const result = await pool.query(
    `SELECT
       m.*,
       a.tail_number,
       a.type AS aircraft_type,
       a.model AS aircraft_model,
       a.operator AS aircraft_operator
     FROM missions m
     LEFT JOIN aircraft a ON a.id = m.aircraft_id
     WHERE m.id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
}

async function updateMissionStatus(id, operatorId, status, extraFields = {}) {
  const updates = ['status = $3'];
  const values = [id, operatorId, status];
  let index = 4;

  if (Object.prototype.hasOwnProperty.call(extraFields, 'conflict_reason')) {
    updates.push(`conflict_reason = $${index}`);
    values.push(extraFields.conflict_reason);
    index += 1;
  }

  if (Object.prototype.hasOwnProperty.call(extraFields, 'assigned_at')) {
    updates.push(`assigned_at = $${index}`);
    values.push(extraFields.assigned_at);
    index += 1;
  }

  if (Object.prototype.hasOwnProperty.call(extraFields, 'completed_at')) {
    updates.push(`completed_at = $${index}`);
    values.push(extraFields.completed_at);
    index += 1;
  }

  const result = await pool.query(
    `UPDATE missions
     SET ${updates.join(', ')}
     WHERE id = $1 AND operator_id = $2
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

module.exports = {
  createMission,
  listMissions,
  listActiveMissions,
  getMissionById,
  getMissionByIdAnyOperator,
  updateMissionStatus,
};
