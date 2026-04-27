const express = require('express');

const { missionQueue } = require('../queues/missionQueue');
const { selectAircraft, checkConflict } = require('../services');
const { validateMissionPayload } = require('./missionValidation');
const {
  createMission,
  listMissions,
  listActiveMissions,
  getMissionById,
  updateMissionStatus,
} = require('../repositories/missionRepository');

const router = express.Router();

function toDispatchedMinute(dispatchedAt) {
  if (!dispatchedAt) {
    return 0;
  }

  const time = new Date(dispatchedAt).getTime();
  if (!Number.isFinite(time)) {
    return 0;
  }

  return time / 60000;
}

router.post('/', async (req, res) => {
  try {
    const operatorId = req.operatorId;
    const validation = validateMissionPayload(req.body || {});

    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { originLat, originLng, destLat, destLng, cargoType, priority } =
      validation.value;
    const selectedAircraft = selectAircraft(originLat, originLng);
    const now = new Date();
    const nowMinute = now.getTime() / 60000;

    const activeMissions = await listActiveMissions(operatorId);
    const conflictCheck = checkConflict(
      {
        origin_lat: originLat,
        origin_lng: originLng,
        dest_lat: destLat,
        dest_lng: destLng,
        dispatched_minute: nowMinute,
      },
      activeMissions.map((mission) => ({
        id: mission.id,
        origin_lat: Number(mission.origin_lat),
        origin_lng: Number(mission.origin_lng),
        dest_lat: Number(mission.dest_lat),
        dest_lng: Number(mission.dest_lng),
        dispatched_minute: toDispatchedMinute(mission.dispatched_at),
      }))
    );

    if (conflictCheck.conflict) {
      const conflictMission = await createMission({
        operatorId,
        aircraftId: selectedAircraft ? selectedAircraft.aircraft_id : null,
        originLat,
        originLng,
        destLat,
        destLng,
        cargoType,
        priority,
        status: 'conflict',
        conflictReason: conflictCheck.reason,
      });

      return res.status(409).json({ mission: conflictMission });
    }

    if (!selectedAircraft) {
      const queuedMission = await createMission({
        operatorId,
        aircraftId: null,
        originLat,
        originLng,
        destLat,
        destLng,
        cargoType,
        priority,
        status: 'queued',
        conflictReason: 'No aircraft available',
      });

      return res.status(409).json({ mission: queuedMission });
    }

    const assignedMission = await createMission({
      operatorId,
      aircraftId: selectedAircraft.aircraft_id,
      originLat,
      originLng,
      destLat,
      destLng,
      cargoType,
      priority,
      status: 'assigned',
      assignedAt: now,
    });

    await missionQueue.add(
      'dispatch-mission',
      {
        missionId: assignedMission.id,
        operatorId,
        aircraftId: selectedAircraft.aircraft_id,
        tailNumber: selectedAircraft.tail_number || null,
        originLat,
        originLng,
        destLat,
        destLng,
      },
      { jobId: assignedMission.id }
    );

    return res.status(201).json({
      mission: {
        ...assignedMission,
        tail_number: selectedAircraft.tail_number || null,
      },
    });
  } catch (err) {
    console.error('POST /api/missions failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const operatorId = req.operatorId;
    const missions = await listMissions(operatorId);
    return res.json(missions);
  } catch (err) {
    console.error('GET /api/missions failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const mission = await getMissionById(req.params.id, req.operatorId);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    return res.json(mission);
  } catch (err) {
    console.error('GET /api/missions/:id failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/cancel', async (req, res) => {
  try {
    const mission = await getMissionById(req.params.id, req.operatorId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    if (mission.status === 'queued') {
      const job = await missionQueue.getJob(req.params.id);
      if (job) {
        await job.remove();
      }
    }

    const updatedMission = await updateMissionStatus(
      req.params.id,
      req.operatorId,
      'cancelled',
      { completed_at: new Date() }
    );

    return res.json(updatedMission);
  } catch (err) {
    console.error('PATCH /api/missions/:id/cancel failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  missionsRoutes: router,
};
