const express = require('express');
const cors = require('cors');
const http = require('http');

const { PORT } = require('./config');
const { connectPostgres, resolveOperator, initSchema } = require('./db');
const { connectRedis } = require('./redis');
const { initSocket } = require('./socket');
const { startFleetMap } = require('./services');
const { authStub } = require('./middleware/auth');
const { aircraftRoutes } = require('./routes');

const app = express();

const FRONTEND_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || FRONTEND_ORIGIN_REGEX.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  })
);
app.use(express.json());
app.use(authStub);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/aircraft', aircraftRoutes);

const server = http.createServer(app);
initSocket(server);

async function main() {
  await connectPostgres();
  await resolveOperator();
  await initSchema();
  await connectRedis();
  await startFleetMap();

  server.listen(PORT, () => {
    console.log(`Express listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

