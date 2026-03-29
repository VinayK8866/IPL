/**
 * PROJECT CRICKET PULSE - GLOBAL CONFIGURATION
 */

export const APP_CONFIG = {
  // Default Match ID for the dashboard
  DEFAULT_MATCH_ID: process.env.NEXT_PUBLIC_DEFAULT_MATCH_ID || "1527674", // RCB vs SRH 2026 Opener
  
  // API Endpoints
  RELAY_SERVER_URL: process.env.NEXT_PUBLIC_RELAY_SERVER_URL || "http://localhost:3001",
  
  // Feature Flags
  ENABLE_AI_PREDICTIONS: true,
  ENABLE_GAMIFICATION: true,
  
  // Performance Settings
  MOMENTUM_SAMPLING_RATE: 2000, // ms
};
