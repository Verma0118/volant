import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3001`;
const MAX_RECONNECT_DELAY_MS = 10000;

export function useFleetSocket(isAuthenticated) {
  const [activeSocket, setActiveSocket] = useState(null);
  const [fleetState, setFleetState] = useState({});
  const [connectionState, setConnectionState] = useState(
    isAuthenticated ? 'connecting' : 'unauthenticated'
  );
  const [announcement, setAnnouncement] = useState(
    isAuthenticated ? 'Connecting to live telemetry...' : 'Sign in to connect telemetry.'
  );
  const [criticalAnnouncement, setCriticalAnnouncement] = useState('');

  const announcementTimeoutRef = useRef(null);
  const pendingUpdatesRef = useRef(new Map());
  const flushScheduledRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      pendingUpdatesRef.current.clear();
      flushScheduledRef.current = false;
      queueMicrotask(() => {
        setActiveSocket(null);
        setFleetState({});
        setConnectionState('unauthenticated');
        setAnnouncement('Sign in to connect telemetry.');
        setCriticalAnnouncement('');
      });
      return undefined;
    }

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
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: MAX_RECONNECT_DELAY_MS,
      timeout: 8000,
    });
    queueMicrotask(() => {
      setActiveSocket(socket);
    });

    socket.on('connect', () => {
      setConnectionState('connected');
      setAnnouncement('Live telemetry connected.');
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
      setAnnouncement('Live telemetry disconnected. Reconnecting...');
    });

    socket.on('connect_error', (err) => {
      setConnectionState('disconnected');
      setCriticalAnnouncement(`Telemetry connection failed: ${err.message}`);
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
      queueMicrotask(() => {
        setActiveSocket(null);
      });
      socket.removeAllListeners();
      socket.close();
    };
  }, [isAuthenticated]);

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
    criticalAnnouncement,
    socket: activeSocket,
  };
}
