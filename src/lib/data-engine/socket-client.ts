import { io, Socket } from "socket.io-client";
import { MomentumData } from "./types";

// Note: In local dev, this points to our relay process
const MOMENTUM_RELAY_URL = process.env.NEXT_PUBLIC_RELAY_SERVER_URL || "http://localhost:3001";

class MomentumSocket {
  private socket: Socket | null = null;
  private listeners: ((data: MomentumData) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.socket = io(MOMENTUM_RELAY_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ["websocket"] // Force WebSocket for sub-second latency
      });

      this.socket.on("data_update", (data: MomentumData) => {
        this.listeners.forEach(cb => cb(data));
      });

      this.socket.on("connect", () => console.log("[Momentum] Connected to Relay"));
      this.socket.on("disconnect", () => console.log("[Momentum] Disconnected from Relay"));
    }
  }

  public subscribe(callback: (data: MomentumData) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const momentumSocket = new MomentumSocket();
