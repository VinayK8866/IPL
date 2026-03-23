# PROJECT CRICKET PULSE (IPL DASHBOARD)

A high-adrenaline, real-time cricket visualization engine built for Next.js, Framer Motion, and Three.js.

## 🚀 Vision
Outperforming mainstream broadcasts in engagement through real-time "Cyber-Sport" aesthetics, high-frequency data ingestion, and AI-moderated community hype.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14 (App Router), Framer Motion, Three.js, Lucide React.
- **Backend/DB**: Supabase (Realtime, Auth, Postgres).
- **AI**: Gemini Pro (Sentiment logic, Expert Analysis).
- **Relay**: Custom Node high-frequency scraper + WebSocket multiplexer.
- **Extension**: Chrome Manifest V3 with Broadcast Sync logic.

## 📁 Key Directories
- `/src/app`: Dashboard (`/`) and Stream (`/stream`) views.
- `/src/components`: HypeMeter, MomentumHeatmap, ScoreCard, and AI Chat.
- `/src/styles/theme.css`: Core "Cyber-Sport" design system (Deep Navy, Electric Purple, Gold).
- `/workers/data_scraper.js`: High-intensity JSON scraper.
- `/extension`: Chrome extension with Sync Lag logic.

## 🎨 Design System: "Cyber-Sport"
- **Colors**: Deep Navy (#0B0E14), Electric Purple (#7A3FE1), Gold (#FFD700), Neon Pink (#FF3366).
- **Aesthetic**: Strictly NO white backgrounds or soft cards. Uses glassmorphism with high-contrast gradients.
- **On-Fire State**: Automated triggers for high strike-rate players (SR > 200, 10+ balls).

## 📊 Database Setup
The `/supabase_schema.sql` file contains the full schema for:
- Profiles & Fan Coins
- Live Matches & Momentum JSON
- Predictions & Bets
- AI-Moderated Chat

## ⚡ Setup
1.  **Dependencies**: `npm install`
2.  **Environment**: Create `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `GEMINI_API_KEY`.
3.  **Run Dev**: `npm run dev`
4.  **Relay**: `node src/lib/data-engine/websocket_relay.js`
5.  **Worker**: `node workers/data_scraper.js`

## 📡 Broadcast Sync (Extension)
The extension includes a `match_delay_offset` variable to align visual triggers with the latency of your official TV or digital stream.
