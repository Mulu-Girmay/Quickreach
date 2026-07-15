const { Server } = require("socket.io");

let io = null;

const init = (server, allowedOrigins) => {
  io = new Server(server, {
    cors: { origin: allowedOrigins },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call init(server) first.");
  }
  return io;
};

module.exports = { init, getIO };
