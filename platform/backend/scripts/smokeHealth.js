const http = require('http');

const HEALTH_URL = process.env.HEALTH_URL || 'http://127.0.0.1:3001/health';

function fail(message) {
  console.error(`Health smoke failed: ${message}`);
  process.exit(1);
}

const req = http.get(HEALTH_URL, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      fail(`expected status 200, got ${res.statusCode}`);
      return;
    }

    try {
      const parsed = JSON.parse(body);
      if (parsed.status !== 'ok') {
        fail(`expected {"status":"ok"}, got ${body}`);
        return;
      }
      console.log('Health smoke passed.');
    } catch {
      fail(`invalid JSON response: ${body}`);
    }
  });
});

req.on('error', (err) => {
  fail(err.message);
});

req.setTimeout(5000, () => {
  req.destroy(new Error('request timed out'));
});
