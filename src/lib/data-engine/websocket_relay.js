/**
 * PROJECT CRICKET PULSE - WEBSOCKET RELAY
 * 
 * Bypasses expensive API costs by multiplexing a single 
 * high-frequency scraping stream to multiple clients via Socket.io.
 */

const { Server } = require("socket.io");
const http = require("http");

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all (in dev)
    methods: ["GET", "POST"]
  }
});

let lastData = {};

io.on("connection", (socket) => {
  console.log(`[Relay] New Client Connected: ${socket.id}`);
  
  // Send last known state immediately
  socket.emit("data_update", lastData);

  socket.on("disconnect", () => {
    console.log(`[Relay] Client Disconnected: ${socket.id}`);
  });
});

/**
 * Update Broadcast
 * This is called by the data_scraper worker or a similar logic.
 */
function broadcastMatchData(data) {
  lastData = data;
  io.emit("data_update", data); // Multi-cast to all users
}

// In a real setup, this would listen on a port or be called via IPC/Redis
httpServer.listen(3001, () => {
  console.log("--- CRICKET PULSE RELAY STARTING ON PORT 3001 ---");
});

module.exports = { broadcastMatchData };
