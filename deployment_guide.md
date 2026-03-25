# Cricket Pulse Deployment Guide

This guide explains how to host the unique architecture of the Cricket Pulse application, which consists of a Next.js frontend and a Node.js data scraper/relay engine.

## 1. Hosting Options

### Option A: Hybrid Hosting (Vercel + VPS) - *Recommended*
- **Frontend (Next.js)**: Deploy to [Vercel](https://vercel.com).
- **Data Engine**: Deploy to a VPS like DigitalOcean, Linode, or AWS EC2.
- **WebSocket URL**: Update `NEXT_PUBLIC_RELAY_SERVER_URL` on Vercel to point to your VPS IP/Domain (e.g., `http://your-vps-ip:3001`).

### Option B: Single VPS Hosting (Docker)
- Use a single VPS to host both the Next.js app and the scraper using Docker Compose to manage the processes.

### Option C: Serverless-Only (No Data Engine)
- If you don't want to manage a VPS, you can rely solely on the **Polling Fallback** implemented in the dashboard. The frontend on Vercel will poll the `/api/matches` route every 10 seconds.
- *Note: This is less efficient for many users, but fine for small-scale use.*

## 2. Setting Up the Data Engine on a VPS
1. Clone the repository on the VPS.
2. Install dependencies: `npm install`.
3. Create `.env.local` with your Supabase credentials.
4. Run the engine using a process manager like **PM2**:
   ```bash
   npm install -g pm2
   pm2 start workers/data_scraper.js --name "cricket-scraper"
   ```

## 3. Environment Variables
Ensure the following are set in your production environment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Only needed for the scraper)
- `NEXT_PUBLIC_RELAY_SERVER_URL` (Point to your scraper's Socket.io port)
- `SCRAPE_INTERVAL` (e.g., `5000` for 5s updates)
