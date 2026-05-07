const aircraftRoutes = require('./aircraft');
const { authRoutes } = require('./auth');
const { missionsRoutes } = require('./missions');
const { maintenanceRoutes } = require('./maintenance');
const { complianceRoutes } = require('./compliance');
const { analyticsRoutes } = require('./analytics');

module.exports = {
  authRoutes,
  aircraftRoutes,
  missionsRoutes,
  maintenanceRoutes,
  complianceRoutes,
  analyticsRoutes,
};
