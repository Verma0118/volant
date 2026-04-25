const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://:redis@localhost:6379';
const CHANNEL = 'telemetry:update';

function fmt(value, width) {
  return String(value).padEnd(width, ' ');
}

function statusRank(status) {
  const ranks = {
    'in-flight': 0,
    charging: 1,
    ready: 2,
    maintenance: 3,
    grounded: 4,
  };
  return ranks[status] ?? 99;
}

function renderTable(snapshotByTail) {
  process.stdout.write('\x1Bc');
  console.log(`Watching ${CHANNEL} on ${REDIS_URL}`);
  console.log(`Updated: ${new Date().toLocaleTimeString()}`);
  console.log(
    [
      fmt('TAIL', 8),
      fmt('STATUS', 12),
      fmt('BAT', 6),
      fmt('SPD', 6),
      fmt('ALT', 7),
      fmt('LAT', 11),
      fmt('LNG', 12),
      'LAST',
    ].join(' ')
  );
  console.log('-'.repeat(88));

  const rows = Object.values(snapshotByTail).sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) {
      return byStatus;
    }
    return a.tail_number.localeCompare(b.tail_number);
  });

  for (const d of rows) {
    const line = [
      fmt(d.tail_number, 8),
      fmt(d.status, 12),
      fmt(`${d.battery_pct}%`, 6),
      fmt(`${d.speed_kts}kt`, 6),
      fmt(`${d.altitude_ft}ft`, 7),
      fmt(Number(d.lat).toFixed(4), 11),
      fmt(Number(d.lng).toFixed(4), 12),
      new Date(d.timestamp).toLocaleTimeString(),
    ].join(' ');
    console.log(line);
  }

  if (!rows.length) {
    console.log('Waiting for telemetry...');
  }
}

async function main() {
  const sub = createClient({ url: REDIS_URL });
  const snapshotByTail = {};
  let hasNewMessage = false;

  sub.on('error', (err) => {
    console.error('Redis subscriber error', err);
  });

  await sub.connect();
  renderTable(snapshotByTail);

  setInterval(() => {
    if (hasNewMessage) {
      hasNewMessage = false;
      renderTable(snapshotByTail);
    }
  }, 1000);

  await sub.subscribe(CHANNEL, (message) => {
    try {
      const d = JSON.parse(message);
      snapshotByTail[d.tail_number] = d;
      hasNewMessage = true;
    } catch (err) {
      console.error('Malformed telemetry payload:', message);
    }
  });
}

main().catch((err) => {
  console.error('Telemetry watch failed', err);
  process.exit(1);
});
