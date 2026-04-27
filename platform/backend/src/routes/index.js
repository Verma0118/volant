const aircraftRoutes = require('./aircraft');
const { authRoutes } = require('./auth');
const { missionsRoutes } = require('./missions');

module.exports = {
  authRoutes,
  aircraftRoutes,
  missionsRoutes,
};
