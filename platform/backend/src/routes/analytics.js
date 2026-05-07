const express = require('express');
const {
  getFleetSummary,
  getAircraftUtilization,
  getMissionsByDay,
} = require('../repositories/analyticsRepository');

const router = express.Router();

router.get('/summary', async (req, res) => {
  try {
    const data = await getFleetSummary(req.operatorId);
    return res.json(data);
  } catch (err) {
    console.error('GET /api/analytics/summary failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/aircraft', async (req, res) => {
  try {
    const data = await getAircraftUtilization(req.operatorId);
    return res.json(data);
  } catch (err) {
    console.error('GET /api/analytics/aircraft failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/missions-by-day', async (req, res) => {
  try {
    const data = await getMissionsByDay(req.operatorId);
    return res.json(data);
  } catch (err) {
    console.error('GET /api/analytics/missions-by-day failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { analyticsRoutes: router };
