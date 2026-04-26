const { Server } = require('socket.io');

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

module.exports = {
  initSocket,
  getIO,
};
