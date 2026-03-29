import { supabase } from "@/lib/supabaseClient";
import { MomentumData } from "./types";

/**
 * MomentumSocket using Supabase Realtime
 * This replaces the Socket.io implementation to allow for free hosting without a VPS.
 */
class MomentumSocket {
  private listeners: ((data: MomentumData) => void)[] = [];
  private channel: any = null;

  constructor() {
    if (typeof window !== "undefined" && supabase && supabase.channel) {
      console.log("[Momentum] Initializing Supabase Realtime...");
      
      this.channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
          },
          (payload: any) => {
            console.log('[Momentum] Realtime Change received:', payload);
            // When a match updates, we could either broadcast just the change 
            // or trigger a full refresh. For simplicity and to match the previous
            // implementation, we'll let the listeners know something changed.
            // Note: In a production app, you might want to fetch the full list 
            // or merge the change into the existing state.
            
            // To maintain compatibility with the dashboard's expectation of { matches: [...] },
            // we'll send a signal that data has changed.
            this.listeners.forEach(cb => cb({ 
                matches: [], // The dashboard will see this and can choose to poll or we could fetch and send
                timestamp: new Date().toISOString() 
            } as any));
          }
        )
        .subscribe();
    }
  }

  public subscribe(callback: (data: MomentumData) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
      if (this.listeners.length === 0 && this.channel) {
          // Optional: unsubscribe from channel if no listeners
      }
    };
  }

  public isConnected() {
    return !!this.channel;
  }
}

export const momentumSocket = new MomentumSocket();

