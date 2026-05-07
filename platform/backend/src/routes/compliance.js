const express = require('express');
const {
  listCompliance,
  getComplianceById,
  streamComplianceCsv,
} = require('../repositories/complianceRepository');

const router = express.Router();

const VALID_REGULATIONS = new Set(['part_107', 'part_135']);
const VALID_LAANC = new Set(['authorized', 'not_required', 'pending']);

router.get('/', async (req, res) => {
  try {
    const { regulation, laanc_status, limit } = req.query;

    if (regulation && !VALID_REGULATIONS.has(regulation)) {
      return res.status(400).json({ error: 'Invalid regulation filter' });
    }
    if (laanc_status && !VALID_LAANC.has(laanc_status)) {
      return res.status(400).json({ error: 'Invalid laanc_status filter' });
    }

    const rows = await listCompliance(req.operatorId, { regulation, laanc_status, limit });
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/compliance failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export.csv', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="compliance_log.csv"');
    await streamComplianceCsv(req.operatorId, res);
    res.end();
  } catch (err) {
    console.error('GET /api/compliance/export.csv failed', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await getComplianceById(req.params.id, req.operatorId);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    return res.json(record);
  } catch (err) {
    console.error('GET /api/compliance/:id failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { complianceRoutes: router };
