const express = require('express');

const { requireCsrfToken } = require('../middleware/csrf');
const {
  getMaintenanceSummary,
  getAircraftMaintenanceSummary,
  listMaintenanceEvents,
  createMaintenanceEvent,
  listMaintenanceDue,
  createMaintenanceDue,
} = require('../repositories/maintenanceRepository');
const { validateEventPayload, validateDuePayload } = require('./maintenanceValidation');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const rows = await getMaintenanceSummary(req.operatorId);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/maintenance failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/aircraft/:aircraftId', async (req, res) => {
  try {
    const summary = await getAircraftMaintenanceSummary(req.params.aircraftId, req.operatorId);
    if (!summary) return res.status(404).json({ error: 'Aircraft not found' });

    const [events, due] = await Promise.all([
      listMaintenanceEvents(req.params.aircraftId, req.operatorId),
      listMaintenanceDue(req.params.aircraftId, req.operatorId),
    ]);

    return res.json({ ...summary, events, due });
  } catch (err) {
    console.error('GET /api/maintenance/aircraft/:id failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/aircraft/:aircraftId/events', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await listMaintenanceEvents(req.params.aircraftId, req.operatorId, limit);
    res.json(events);
  } catch (err) {
    console.error('GET /api/maintenance/aircraft/:id/events failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/aircraft/:aircraftId/events', requireCsrfToken, async (req, res) => {
  try {
    const validation = validateEventPayload(req.body || {});
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const event = await createMaintenanceEvent({
      aircraftId: req.params.aircraftId,
      operatorId: req.operatorId,
      recordedBy: req.userId || null,
      ...validation.value,
    });

    return res.status(201).json(event);
  } catch (err) {
    console.error('POST /api/maintenance/aircraft/:id/events failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/aircraft/:aircraftId/due', async (req, res) => {
  try {
    const due = await listMaintenanceDue(req.params.aircraftId, req.operatorId);
    res.json(due);
  } catch (err) {
    console.error('GET /api/maintenance/aircraft/:id/due failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/aircraft/:aircraftId/due', requireCsrfToken, async (req, res) => {
  try {
    const validation = validateDuePayload(req.body || {});
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const item = await createMaintenanceDue({
      aircraftId: req.params.aircraftId,
      operatorId: req.operatorId,
      ...validation.value,
    });

    return res.status(201).json(item);
  } catch (err) {
    console.error('POST /api/maintenance/aircraft/:id/due failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { maintenanceRoutes: router };
