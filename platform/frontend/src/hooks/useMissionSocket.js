import { useEffect, useMemo, useState } from 'react';

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3001`;

function toMissionMap(missions) {
  const next = {};
  (missions || []).forEach((mission) => {
    if (!mission?.mission_id && !mission?.id) {
      return;
    }
    const key = mission.mission_id || mission.id;
    next[key] = {
      mission_id: key,
      status: mission.status,
      aircraft_id: mission.aircraft_id,
      tail_number: mission.tail_number || null,
      priority: mission.priority,
      cargo_type: mission.cargo_type,
      conflict_reason: mission.conflict_reason || null,
      origin_lat: mission.origin_lat,
      origin_lng: mission.origin_lng,
      dest_lat: mission.dest_lat,
      dest_lng: mission.dest_lng,
      dispatched_at: mission.dispatched_at,
      assigned_at: mission.assigned_at,
      completed_at: mission.completed_at,
    };
  });
  return next;
}

export function useMissionSocket(socket, token) {
  const [missionsState, setMissionsState] = useState({});

  useEffect(() => {
    if (!token) {
      setMissionsState({});
      return undefined;
    }

    async function fetchMissions() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/missions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(payload)) {
          return;
        }
        setMissionsState(toMissionMap(payload));
      } catch (_err) {
        // Ignore transient network failures.
      }
    }

    fetchMissions();

    if (!socket) {
      return undefined;
    }

    const onMissionUpdate = (payload) => {
      if (!payload?.mission_id) {
        return;
      }
      setMissionsState((previous) => ({
        ...previous,
        [payload.mission_id]: {
          ...(previous[payload.mission_id] || {}),
          ...payload,
        },
      }));
    };

    const onReconnect = () => {
      fetchMissions();
    };

    socket.on('mission:update', onMissionUpdate);
    socket.on('connect', onReconnect);

    return () => {
      socket.off('mission:update', onMissionUpdate);
      socket.off('connect', onReconnect);
    };
  }, [socket, token]);

  const missionsList = useMemo(
    () =>
      Object.values(missionsState).sort((a, b) => {
        const aTime = new Date(a.dispatched_at || 0).getTime();
        const bTime = new Date(b.dispatched_at || 0).getTime();
        return bTime - aTime;
      }),
    [missionsState]
  );

  return { missionsState, missionsList };
}
