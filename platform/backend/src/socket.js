const { Server } = require('socket.io');
const { verifyAccessToken, extractCookieToken } = require('./middleware/auth');
const {
  ALLOW_MISSING_ORIGIN,
  FRONTEND_ORIGIN,
  SECURITY_HARDENED,
} = require('./config');

let io;

const FRONTEND_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) {
    return ALLOW_MISSING_ORIGIN;
  }
  if (FRONTEND_ORIGIN && origin === FRONTEND_ORIGIN) {
    return true;
  }
  if (!SECURITY_HARDENED && FRONTEND_ORIGIN_REGEX.test(origin)) {
    return true;
  }
  return false;
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  // Basic anti-bot throttle for new Socket.io connections.
  // Prevents connection floods from hammering auth/telemetry endpoints.
  const CONNECTION_WINDOW_MS = 60_000;
  const MAX_CONNECTIONS_PER_IP = 12;
  const connectionBuckets = new Map(); // ip -> { count, resetAtMs }

  function getClientIp(socket) {
    return socket?.handshake?.address || '';
  }

  function isConnectionAllowed(ip) {
    if (!ip) return true;
    const now = Date.now();
    const existing = connectionBuckets.get(ip);
    if (!existing || now >= existing.resetAtMs) {
      connectionBuckets.set(ip, { count: 1, resetAtMs: now + CONNECTION_WINDOW_MS });
      return true;
    }

    if (existing.count >= MAX_CONNECTIONS_PER_IP) {
      return false;
    }

    existing.count += 1;
    connectionBuckets.set(ip, existing);
    return true;
  }

  io.use((socket, next) => {
    const ip = getClientIp(socket);
    if (!isConnectionAllowed(ip)) {
      next(new Error('Too many connections'));
      return;
    }

    const token =
      socket.handshake?.auth?.token ||
      extractCookieToken(socket.handshake?.headers?.cookie);
    if (!token) {
      next(new Error('No token'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.user = payload;
      next();
    } catch (_err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${io.engine.clientsCount} total)`);
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

function emitMissionUpdate(payload) {
  getIO().emit('mission:update', payload);
}

module.exports = {
  initSocket,
  getIO,
  emitMissionUpdate,
};
