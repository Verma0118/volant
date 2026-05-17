const { TELEMETRY_API_KEY } = require('../config');

function apiKeyMiddleware(req, res, next) {
  if (!TELEMETRY_API_KEY) {
    return res.status(503).json({ error: 'Telemetry ingest not configured (TELEMETRY_API_KEY missing)' });
  }

  const key = req.headers['x-volant-api-key'];
  if (!key || key !== TELEMETRY_API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  return next();
}

module.exports = { apiKeyMiddleware };
