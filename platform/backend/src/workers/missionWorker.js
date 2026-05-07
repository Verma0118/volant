const { Worker } = require('bullmq');
const { REDIS_URL } = require('../config');
const { parseRedisUrl } = require('../queues/missionQueue');
const { fleetState } = require('../services/fleetMap');
const { emitMissionUpdate } = require('../socket');
const {
  getMissionByIdAnyOperator,
  updateMissionStatus,
} = require('../repositories/missionRepository');
const { accrueFlightMinutes } = require('../services/maintenanceAccrual');
const {
  estimateFlightDurationMs,
  toMissionUpdatePayload,
} = require('./missionWorkerHelpers');
const { setMissionPath, clearMissionPath } = require('../services/missionPathRedis');

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function updateFleetAircraftStatus(aircraftId, nextStatus) {
  const current = fleetState[aircraftId];
  if (!current) {
    return;
  }

  fleetState[aircraftId] = {
    ...current,
    status: nextStatus,
    timestamp: new Date().toISOString(),
  };
}

function safeEmitMissionUpdate(mission) {
  try {
    emitMissionUpdate(toMissionUpdatePayload(mission));
  } catch (err) {
    console.error('Mission update emit failed', err.message);
  }
}

async function processMissionJob(job) {
  const {
    missionId,
    aircraftId,
    originLat,
    originLng,
    destLat,
    destLng,
    operatorId,
  } = job.data;

  const missionRecord = await getMissionByIdAnyOperator(missionId);
  if (!missionRecord) {
    throw new Error(`Mission ${missionId} not found`);
  }

  const effectiveOperatorId = operatorId || missionRecord.operator_id;
  const assignedAt = new Date();
  const assignedMission = await updateMissionStatus(
    missionId,
    effectiveOperatorId,
    'assigned',
    { assigned_at: assignedAt, completed_at: null }
  );
  if (assignedMission) {
    const latest = await getMissionByIdAnyOperator(missionId);
    if (latest) {
      console.log(`Mission assigned: ${missionId} -> ${latest.tail_number || aircraftId}`);
      safeEmitMissionUpdate(latest);
    }
  }

  await updateMissionStatus(missionId, effectiveOperatorId, 'in-flight');
  updateFleetAircraftStatus(aircraftId, 'in-flight');
  {
    const latest = await getMissionByIdAnyOperator(missionId);
    if (latest) {
      console.log(`Mission in-flight: ${missionId}`);
      safeEmitMissionUpdate(latest);
    }
  }

  const flightDurationMs = estimateFlightDurationMs({
    originLat,
    originLng,
    destLat,
    destLng,
  });

  const cur = fleetState[aircraftId];
  const startLat =
    cur && Number.isFinite(Number(cur.lat)) ? Number(cur.lat) : Number(originLat);
  const startLng =
    cur && Number.isFinite(Number(cur.lng)) ? Number(cur.lng) : Number(originLng);

  await setMissionPath(String(aircraftId), {
    startLat,
    startLng,
    endLat: Number(destLat),
    endLng: Number(destLng),
    startMs: Date.now(),
    durationMs: flightDurationMs,
  });

  await delay(flightDurationMs);

  await updateMissionStatus(missionId, effectiveOperatorId, 'completed', {
    completed_at: new Date(),
  });
  await accrueFlightMinutes({
    missionId,
    operatorId: effectiveOperatorId,
    aircraftId,
    flightDurationMs,
  });
  updateFleetAircraftStatus(aircraftId, 'charging');
  await clearMissionPath(String(aircraftId), 'charging');
  {
    const latest = await getMissionByIdAnyOperator(missionId);
    if (latest) {
      console.log(`Mission completed: ${missionId}`);
      safeEmitMissionUpdate(latest);
    }
  }
}

const worker = new Worker(
  'missions',
  async (job) => {
    console.log(`Mission job received: ${job.id}`, job.data);
    await processMissionJob(job);
  },
  {
    connection: parseRedisUrl(REDIS_URL),
  }
);

worker.on('completed', (job) => {
  console.log(`Mission job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`Mission job failed: ${job ? job.id : 'unknown'}`, err.message);
  if (job?.data?.missionId && job?.data?.operatorId) {
    updateMissionStatus(job.data.missionId, job.data.operatorId, 'failed', {
      conflict_reason: err.message,
      completed_at: new Date(),
    }).catch((dbErr) => {
      console.error('Failed to persist mission failure', dbErr.message);
    });
  }
  if (job?.data?.aircraftId) {
    updateFleetAircraftStatus(job.data.aircraftId, 'charging');
    clearMissionPath(String(job.data.aircraftId), 'charging').catch(() => {});
  }
});

module.exports = {
  worker,
  processMissionJob,
  updateFleetAircraftStatus,
};
