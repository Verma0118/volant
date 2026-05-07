const aircraftRoutes = require('./aircraft');
const { authRoutes } = require('./auth');
const { missionsRoutes } = require('./missions');
const { maintenanceRoutes } = require('./maintenance');

module.exports = {
  authRoutes,
  aircraftRoutes,
  missionsRoutes,
  maintenanceRoutes,
};
