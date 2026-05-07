const { pool } = require('../db');

/** Write one battery sample per aircraft every SAMPLE_INTERVAL_MS (default 10s). */
const SAMPLE_INTERVAL_MS = 10_000;

const lastWrittenAt = new Map();

/**
 * Called from the telemetry subscriber on each tick.
 * Throttles writes to SAMPLE_INTERVAL_MS per aircraft_id.
 */
async function recordBatterySample({ aircraftId, operatorId, batteryPct, status }) {
  const now = Date.now();
  const last = lastWrittenAt.get(aircraftId) || 0;

  if (now - last < SAMPLE_INTERVAL_MS) return;
  lastWrittenAt.set(aircraftId, now);

  try {
    await pool.query(
      `INSERT INTO battery_samples (aircraft_id, operator_id, battery_pct, status)
       VALUES ($1, $2, $3, $4)`,
      [aircraftId, operatorId, batteryPct, status]
    );
  } catch (err) {
    // Non-fatal — history is best-effort
    console.error('battery_samples insert failed', err.message);
  }
}

module.exports = { recordBatterySample };
