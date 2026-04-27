const { Server } = require('socket.io');
const { verifyAccessToken } = require('./middleware/auth');

let io;

const FRONTEND_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || FRONTEND_ORIGIN_REGEX.test(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake?.auth?.token;
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
