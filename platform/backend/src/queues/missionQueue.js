const { Queue } = require('bullmq');
const { REDIS_URL } = require('../config');

function parseRedisUrl(url) {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
  };
}

const connection = parseRedisUrl(REDIS_URL);
const missionQueue = new Queue('missions', { connection });

async function initMissionQueue() {
  await missionQueue.waitUntilReady();
  console.log('Mission queue ready');
}

module.exports = {
  missionQueue,
  initMissionQueue,
  parseRedisUrl,
};
