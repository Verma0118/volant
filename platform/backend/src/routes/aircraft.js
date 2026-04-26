const express = require('express');

const { getAircraft, getAircraftById } = require('../repositories/aircraftRepository');
const { fleetState } = require('../services');
const { mergeWithLiveState } = require('../utils/fleetTransforms');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const operatorId = req.operatorId;
    const aircraft = await getAircraft(operatorId);
    res.json(aircraft.map((row) => mergeWithLiveState(row, fleetState)));
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

    return res.json(mergeWithLiveState(aircraft, fleetState));
  } catch (err) {
    console.error('GET /api/aircraft/:id failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
