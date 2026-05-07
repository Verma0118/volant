const { pool: defaultPool } = require('../db');

/**
 * Atomically adds flight minutes to aircraft.total_flight_minutes.
 * Idempotent: no-op if missions.maintenance_minutes_applied is already true.
 * Uses SELECT FOR UPDATE to prevent double-count on BullMQ worker retry.
 *
 * @param {object} opts
 * @param {string} opts.missionId
 * @param {string} opts.operatorId
 * @param {string} opts.aircraftId
 * @param {number} opts.flightDurationMs
 * @param {object} [db] - injectable pool for testing; defaults to real pool
 */
async function accrueFlightMinutes({ missionId, operatorId, aircraftId, flightDurationMs }, db) {
  const p = db || defaultPool;
  const minutes = flightDurationMs / 1000 / 60;

  const client = await p.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `SELECT maintenance_minutes_applied
       FROM missions
       WHERE id = $1 AND operator_id = $2
       FOR UPDATE`,
      [missionId, operatorId]
    );

    if (!rows.length || rows[0].maintenance_minutes_applied) {
      await client.query('ROLLBACK');
      return;
    }

    await client.query(
      `UPDATE aircraft
       SET total_flight_minutes = total_flight_minutes + $1
       WHERE id = $2 AND operator_id = $3`,
      [minutes, aircraftId, operatorId]
    );

    await client.query(
      `UPDATE missions
       SET maintenance_minutes_applied = true
       WHERE id = $1 AND operator_id = $2`,
      [missionId, operatorId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { accrueFlightMinutes };
