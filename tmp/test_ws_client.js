const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("Connected to Relay!");
});

socket.on("data_update", (data) => {
  console.log("Received Data Update:");
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("Connection Error:", err.message);
});

setTimeout(() => {
  console.log("Timeout waiting for data.");
  process.exit(1);
}, 10000);
