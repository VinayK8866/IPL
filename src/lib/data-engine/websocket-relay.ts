import { Server as SocketServer } from 'socket.io';
import { createServer } from 'http';
import { MomentumData } from './types';

/**
 * PROJECT CRICKET PULSE - REALTIME WEBSOCKET RELAY
 * 
 * Multiplexes high-frequency scraping data to user clients.
 * Designed for sub-second latency and high-velocity Momentum data.
 * 
 * Note: This module is intended to be run as part of a background process 
 * or a dedicated microservice.
 */

export class CricketPulseRelay {
  private io: SocketServer;
  private lastMomentum: MomentumData | null = null;
  private matchId: string;

  constructor(port: number = 3001, matchId: string) {
    this.matchId = matchId;
    const httpServer = createServer();
    this.io = new SocketServer(httpServer, {
      cors: {
        origin: "*", // Adjust for prod
        methods: ["GET", "POST"]
      }
    });

    this.io.on('connection', (socket: any) => {
      console.log(`[Relay] New Client: ${socket.id}`);
      if (this.lastMomentum) {
        socket.emit('data_update', this.lastMomentum);
      }
    });

    httpServer.listen(port, () => {
      console.log(`--- CRICKET PULSE RELAY STARTING ON PORT ${port} ---`);
    });
  }

  /**
   * Broadcast high-velocity momentum data.
   * This is triggered by our scraper engine.
   */
  public broadcastMomentum(data: MomentumData) {
    this.lastMomentum = data;
    this.io.emit('data_update', data);
  }

  /**
   * Status check for internal logs
   */
  public getConnections() {
    return this.io.engine.clientsCount;
  }
}

// Singleton usage or individual match relays
export default CricketPulseRelay;
