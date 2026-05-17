const express = require('express');
const { redis } = require('../redis');
const { pool } = require('../db');
const { CURRENT_OPERATOR_ID } = require('../config');

const TELEMETRY_CHANNEL = 'telemetry:update';
const FLEET_STATE_HASH = 'fleet:state';

const VALID_STATUSES = new Set(['in-flight', 'charging', 'ready', 'maintenance', 'grounded']);

function validatePayload(body) {
  const { aircraft_id, tail_number, lat, lng, altitude_ft, speed_kts, heading_deg, battery_pct, status } = body;

  if (!aircraft_id && !tail_number) {
    return 'aircraft_id or tail_number required';
  }
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return 'lat must be a number between -90 and 90';
  }
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    return 'lng must be a number between -180 and 180';
  }
  if (altitude_ft !== undefined && (typeof altitude_ft !== 'number' || altitude_ft < 0)) {
    return 'altitude_ft must be a non-negative number';
  }
  if (speed_kts !== undefined && (typeof speed_kts !== 'number' || speed_kts < 0)) {
    return 'speed_kts must be a non-negative number';
  }
  if (heading_deg !== undefined && (typeof heading_deg !== 'number' || heading_deg < 0 || heading_deg > 360)) {
    return 'heading_deg must be between 0 and 360';
  }
  if (battery_pct !== undefined && (typeof battery_pct !== 'number' || battery_pct < 0 || battery_pct > 100)) {
    return 'battery_pct must be between 0 and 100';
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return `status must be one of: ${[...VALID_STATUSES].join(', ')}`;
  }

  return null;
}

async function resolveAircraft(aircraftId, tailNumber) {
  const operatorId = CURRENT_OPERATOR_ID;
  if (!operatorId) {
    throw new Error('CURRENT_OPERATOR_ID not set');
  }

  if (aircraftId) {
    const { rows } = await pool.query(
      'SELECT id, tail_number FROM aircraft WHERE id = $1 AND operator_id = $2',
      [aircraftId, operatorId]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query(
    'SELECT id, tail_number FROM aircraft WHERE tail_number = $1 AND operator_id = $2',
    [tailNumber, operatorId]
  );
  return rows[0] || null;
}

const router = express.Router();

router.post('/ingest', async (req, res) => {
  const validationError = validatePayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { aircraft_id, tail_number, lat, lng, altitude_ft = 0, speed_kts = 0, heading_deg = 0, battery_pct = 0, status = 'in-flight' } = req.body;

  try {
    const aircraft = await resolveAircraft(aircraft_id, tail_number);
    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found for this operator' });
    }

    const payload = {
      aircraft_id: aircraft.id,
      tail_number: aircraft.tail_number,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      altitude_ft: Math.round(altitude_ft),
      speed_kts: Math.round(speed_kts),
      heading_deg: Math.round(heading_deg),
      battery_pct: Math.min(100, Math.round(battery_pct)),
      status,
      timestamp: new Date().toISOString(),
      source: 'hardware',
    };

    await redis.publish(TELEMETRY_CHANNEL, JSON.stringify(payload));
    await redis.hSet(FLEET_STATE_HASH, aircraft.id, JSON.stringify(payload));

    return res.json({ ok: true, aircraft_id: aircraft.id, tail_number: aircraft.tail_number });
  } catch (err) {
    console.error('POST /api/telemetry/ingest failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { telemetryRoutes: router };
