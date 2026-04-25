const express = require('express');
const cors = require('cors');

const { PORT } = require('./config');
const { connectPostgres } = require('./db');
const { connectRedis } = require('./redis');

async function main() {
  await connectPostgres();
  await connectRedis();

  const app = express();

  app.use(
    cors({
      origin: ['http://localhost:5173'],
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(PORT, () => {
    console.log(`Express listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});

