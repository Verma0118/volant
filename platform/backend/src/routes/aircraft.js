const express = require('express');

const { getAircraft, getAircraftById } = require('../db');
const { fleetState } = require('../services/fleetMap');

const router = express.Router();

function mergeWithLiveState(aircraftRow) {
  const live = fleetState[aircraftRow.id] || {};

  return {
    id: aircraftRow.id,
    tail_number: aircraftRow.tail_number,
    type: aircraftRow.type,
    model: aircraftRow.model,
    operator: aircraftRow.operator,
    lat: live.lat ?? null,
    lng: live.lng ?? null,
    altitude_ft: live.altitude_ft ?? null,
    speed_kts: live.speed_kts ?? null,
    heading_deg: live.heading_deg ?? null,
    battery_pct: live.battery_pct ?? null,
    status: live.status ?? 'unknown',
    last_update: live.timestamp ?? null,
  };
}

router.get('/', async (req, res) => {
  try {
    const operatorId = req.operatorId;
    const aircraft = await getAircraft(operatorId);
    res.json(aircraft.map(mergeWithLiveState));
  } catch (err) {
    console.error('GET /api/aircraft failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const operatorId = req.operatorId;
    const aircraft = await getAircraftById(req.params.id, operatorId);

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    return res.json(mergeWithLiveState(aircraft));
  } catch (err) {
    console.error('GET /api/aircraft/:id failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
