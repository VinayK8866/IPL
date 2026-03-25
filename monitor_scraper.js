const { io } = require("socket.io-client");

const socket = io("http://localhost:3001");

console.log("Connecting to Cricket Pulse Relay on Port 3001...");

socket.on("connect", () => {
    console.log("CONNECTED TO RELAY! Monitoring data flow...");
});

socket.on("data_update", (data) => {
    console.log("--- RECEIVED UPDATE ---");
    console.log("FULL DATA:", JSON.stringify(data, null, 2));
    console.log(`Match: ${data.team_a} vs ${data.team_b}`);
    console.log(`Score: ${data.score} (${data.overs} Overs)`);
    console.log(`Win Probability: ${data.team_a} (${(data.win_prob_a * 100).toFixed(1)}%)`);
    console.log(`Last 5 Balls: ${data.last_balls?.map(b => b.type).join(', ')}`);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log("------------------------");
});

socket.on("connect_error", (err) => {
    console.error("Connection Error:", err.message);
});

// Run for 15 seconds then exit
setTimeout(() => {
    console.log("Monitoring complete.");
    process.exit(0);
}, 15000);
