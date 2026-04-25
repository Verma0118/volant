const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis@localhost:6379';

const redis = createClient({ url: REDIS_URL });

redis.on('error', (err) => {
  // Keep this terse: we only want a single info log on success.
  console.error('Redis error', err);
});

async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  console.log('Redis connected');
}

module.exports = {
  redis,
  connectRedis,
};

