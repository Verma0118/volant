import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3001`;
const MAX_RECONNECT_DELAY_MS = 10000;

export function useFleetSocket() {
  const [fleetState, setFleetState] = useState({});
  const [connectionState, setConnectionState] = useState('connecting');
  const [announcement, setAnnouncement] = useState('Connecting to live telemetry...');

  const announcementTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef(new Map());
  const flushScheduledRef = useRef(false);

  useEffect(() => {
    const flushPendingUpdates = () => {
      flushScheduledRef.current = false;

      if (!pendingUpdatesRef.current.size) {
        return;
      }

      setFleetState((previous) => {
        const next = { ...previous };
        pendingUpdatesRef.current.forEach((payload, aircraftId) => {
          next[aircraftId] = payload;
        });
        pendingUpdatesRef.current.clear();
        return next;
      });
    };

    const scheduleFlush = () => {
      if (flushScheduledRef.current) {
        return;
      }

      flushScheduledRef.current = true;
      requestAnimationFrame(flushPendingUpdates);
    };

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
      timeout: 8000,
    });

    socket.on('connect', () => {
      setConnectionState('connected');
      setAnnouncement('Live telemetry connected.');
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      setAnnouncement('Live telemetry disconnected. Reconnecting...');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState('reconnecting');
      setAnnouncement('Attempting to reconnect to telemetry.');
    });

    socket.on('fleet:snapshot', (snapshot) => {
      setFleetState(snapshot || {});
    });

    socket.on('aircraft:update', (payload) => {
      if (!payload?.aircraft_id) {
        return;
      }

      pendingUpdatesRef.current.set(payload.aircraft_id, payload);
      scheduleFlush();
    });

    return () => {
      socket.removeAllListeners();
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!announcement) {
      return undefined;
    }

    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, 2500);

    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, [announcement]);

  return {
    fleetState,
    connectionState,
    announcement,
  };
}
