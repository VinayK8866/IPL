PROJECT CRICKET PULSE (IPL DASHBOARD)
1. Vision & Core Architecture
A high-adrenaline, real-time cricket visualization engine designed to outperform mainstream broadcasts in engagement. The platform serves three distinct contexts: a web dashboard for high-intensity viewing, a Chrome extension for overlaying official streams, and a YouTube-optimized layout for content creators.

Core Tech Stack
Frontend: Next.js 14 (App Router) + Framer Motion (Momentum/VFX) + Three.js (3D Pitch Map).
Backend/Database: Supabase (PostgreSQL + Realtime + Auth).
AI Integration: Google Gemini Pro (Chat moderation, Insight extraction, Automated news ticker).
Data Ingestion (The "Jugaad"): High-frequency scraping of public-domain scoreboard endpoints combined with a custom WebSocket relay to bypass expensive API costs.
Extension: Manifest V3 (React/Shadow DOM) with broadcast sync logic.
2. Database Schema
-- User Profile & Gamification
table profiles {
  id uuid pk,
  username text unique,
  fan_coins bigint default 1000,
  avatar_url text,
  hype_level int default 1,
  created_at timestamp
}

-- Live Game Data
table matches {
  id text pk,
  team_a text, team_b text,
  win_prob_a float, win_prob_b float,
  current_momentum_json jsonb, -- Stores wave graph history
  status enum('live', 'scheduled', 'finished')
}

-- Prediction Engine
table predictions {
  id uuid pk,
  user_id uuid fk,
  match_id text fk,
  ball_index int, -- To prevent late-betting exploit
  bet_type enum('6', '4', 'wicket', 'dot', 'other'),
  amount int,
  outcome enum('pending', 'won', 'lost')
}

-- Community & AI Chat
table chat_messages {
  id uuid pk,
  user_id uuid fk,
  match_id text fk,
  content text,
  sentiment_score float, -- Gemini analyzed
  is_hype_insight boolean default false,
  created_at timestamp
}

-- Global State
table match_hype {
  match_id text pk,
  team_a_clicks bigint,
  team_b_clicks bigint
}
3. Third-Party Integrations & Jugaad Strategy
Authentication: Supabase Auth (Google Social Login only for 1-click conversion).
Data Feed: Custom Node-cron worker scraping static JSON scorecards every 2 seconds; deduplication layer to ensure UI doesn't flicker.
AI Moderation: Gemini Pro used as a batch processor for chat messages. Messages with sentiment_score > 0.8 are pinned as "Expert Analysis".
Real-time Engine: Supabase Realtime for Hype Meter and Coin updates; Socket.io for the low-latency Momentum Heatmap.
4. Styling & UI Philosophy
Anti-SaaS Aesthetic: Strictly NO white backgrounds or rounded soft cards. Use "Cyber-Sport" aesthetic.
Colors: Deep Navy (#0B0E14), Electric Purple (Kolkata), Gold (CSK), Neon Pink (RR). Use high-contrast gradients.
Motion: Every boundary hit triggers a CanvasConfetti or custom GLSL fragment shader "explosion". The Momentum Heatmap must be a fluid SVG path that animates smoothly between data points.
On-Fire State: When a player exceeds a strike rate of 200 (min 10 balls), their card gains a CSS filter: drop-shadow with an animated fire sprite overlay.
5. File Structure Constraints
/src
  /app                # Next.js App Router
  /components
    /dashboard        # Heatmaps, PitchMap (3D), Scoreboards
    /gaming           # Prediction stocks, Coin shop, Hype meter
    /chat             # AI Moderated chat components
    /stream-layout    # Specialized views for OBS/YouTube
  /lib
    /gemini           # AI logic & moderation prompts
    /data-engine      # Scraping & WebSocket relay logic
    /hooks            # useCricketRealtime, usePredictionStore
/extension
  /src
    /content-scripts  # Broadcaster overlay logic
    /popup            # Mini-dashboard
  /public             # Manifest and icons
/workers              # Background scraping cron jobs
6. Execution Directives
Latency Sync: Implement a match_delay_offset state variable globally. All visual triggers must be delayed by this value to align with the user's TV/Stream lag.
Digital Rewards: Focus on "Visual Tier Levels" for users. High-coin users get glowing names in chat and exclusive emojis.
Performance: Use memo heavily for the Scoreboard to prevent re-renders on the 3D Pitch Map during high-frequency data updates.