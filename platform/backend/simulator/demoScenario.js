const API_BASE_URL = process.env.DEMO_API_BASE_URL || 'http://127.0.0.1:3001';
const DEMO_EMAIL = 'dispatcher@volant.demo';
const DEMO_PASSWORD = 'dispatch123';
const MISSION_PAYLOAD = {
  origin_lat: 32.8998,
  origin_lng: -97.0403,
  dest_lat: 32.7767,
  dest_lng: -96.797,
  cargo_type: 'medical',
  priority: 'urgent',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginWithRetry(maxAttempts = 40) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.token) {
          return payload.token;
        }
      }
    } catch (_err) {
      // Backend may still be booting; retry below.
    }

    if (attempt === maxAttempts) {
      throw new Error('Failed to authenticate demo user after retries.');
    }
    await sleep(1500);
  }

  throw new Error('Unreachable login retry state.');
}

async function dispatchMission(token) {
  const response = await fetch(`${API_BASE_URL}/api/missions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(MISSION_PAYLOAD),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      `Mission dispatch failed (${response.status}): ${payload?.mission?.conflict_reason || payload.error || 'unknown'}`
    );
  }

  if (!payload.mission?.id) {
    throw new Error('Mission dispatch succeeded but response missing mission id.');
  }

  return payload.mission;
}

async function dispatchMissionWithRetry(token, maxAttempts = 18) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await dispatchMission(token);
    } catch (err) {
      const message = String(err.message || '');
      const retryable = message.includes('No aircraft available');
      if (!retryable || attempt === maxAttempts) {
        throw err;
      }
      console.log(
        `[demo] Dispatch attempt ${attempt}/${maxAttempts} blocked (no aircraft). Retrying in 5s...`
      );
      await sleep(5000);
    }
  }

  throw new Error('Unreachable dispatch retry state.');
}

async function getMission(token, missionId) {
  const response = await fetch(`${API_BASE_URL}/api/missions/${missionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function getAircraft(token, aircraftId) {
  if (!aircraftId) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/aircraft/${aircraftId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function main() {
  const startMs = Date.now();
  console.log('[demo] T+0s Fleet baseline running (10 aircraft simulator state).');

  const token = await loginWithRetry();
  console.log('[demo] Authenticated demo dispatcher user.');

  await sleep(30000);
  console.log('[demo] T+30s Dispatching urgent medical mission DFW -> Downtown Dallas.');
  const mission = await dispatchMissionWithRetry(token);
  console.log(
    `[demo] Mission created: ${mission.id} | status=${mission.status} | aircraft=${mission.tail_number || mission.aircraft_id || 'unassigned'}`
  );

  let lastLoggedStatus = null;
  let midpointLogged = false;
  const timeoutMs = 300000;

  while (Date.now() - startMs < timeoutMs) {
    const liveMission = await getMission(token, mission.id);
    if (!liveMission) {
      await sleep(3000);
      continue;
    }

    if (liveMission.status !== lastLoggedStatus) {
      const elapsed = Math.round((Date.now() - startMs) / 1000);
      console.log(
        `[demo] T+${elapsed}s Mission status -> ${liveMission.status} (${liveMission.tail_number || liveMission.aircraft_id || 'unassigned'})`
      );
      lastLoggedStatus = liveMission.status;
    }

    const elapsed = Math.round((Date.now() - startMs) / 1000);

    if (!midpointLogged && liveMission.status === 'in-flight' && elapsed >= 60) {
      const aircraft = await getAircraft(token, liveMission.aircraft_id);
      if (aircraft) {
        console.log(
          `[demo] T+${elapsed}s Mid-flight check: ${aircraft.tail_number || liveMission.tail_number} battery ${Math.round(aircraft.battery_pct || 0)}%`
        );
      }
      midpointLogged = true;
    }

    if (liveMission.status === 'completed') {
      console.log(`[demo] T+${elapsed}s Mission completed. Route should now disappear on Fleet Map.`);
      return;
    }

    await sleep(3000);
  }

  throw new Error('Demo scenario timed out before mission reached completed state.');
}

main().catch((err) => {
  console.error('[demo] Scenario failed:', err.message);
  process.exit(1);
});
