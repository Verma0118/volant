const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');

const {
  PORT,
  ALLOW_MISSING_ORIGIN,
  FRONTEND_ORIGIN,
  SECURITY_HARDENED,
} = require('./config');
const { connectPostgres, resolveOperator, initSchema } = require('./db');
const { connectRedis } = require('./redis');
const { initSocket } = require('./socket');
const { startFleetMap } = require('./services');
const { initMissionQueue } = require('./queues/missionQueue');
const { worker } = require('./workers/missionWorker');
const { authMiddleware } = require('./middleware/auth');
const { authRoutes, aircraftRoutes, missionsRoutes } = require('./routes');

const app = express();

const FRONTEND_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) {
    return ALLOW_MISSING_ORIGIN;
  }
  if (FRONTEND_ORIGIN && origin === FRONTEND_ORIGIN) {
    return true;
  }
  if (!SECURITY_HARDENED && FRONTEND_ORIGIN_REGEX.test(origin)) {
    return true;
  }
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again shortly.' },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rate limit general API traffic (login is not separately capped — OK for demos).
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', authMiddleware);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/missions', missionsRoutes);

const server = http.createServer(app);
initSocket(server);

async function main() {
  await connectPostgres();
  await resolveOperator();
  await initSchema();
  await connectRedis();
  await startFleetMap();
  await initMissionQueue();
  if (worker) {
    console.log('Mission worker listening');
  }

  server.listen(PORT, () => {
    console.log(`Express listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

