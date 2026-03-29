# 🚀 Free Hosting Guide: Cricket Pulse

You can host this entire application **for free** using Vercel (frontend + API) and Supabase (database). This setup eliminates the need for a paid VPS/Server.

## 1. Database Setup (Supabase - Free)
1. Go to [Supabase](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the contents of `supabase_setup.sql` from this project and run them.
4. Go to **Project Settings > API** and note down:
   - `Project URL`
   - `anon public API key`
   - `service_role secret API key` (Keep this secret!)

## 2. Deployment Setup (Vercel - Free)
1. Push your code to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and import your repository.
3. **Environment Variables**: Add the following in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service_role key.
4. Click **Deploy**.

## 3. How the "Free" Engine works
- **No VPS Needed**: We replaced the standalone Node.js scraper with an **On-Demand Scraper** inside the `/api/matches` route.
- **Smart Syncing**: Every time a user visits the dashboard, the app hits the API, which fetches live scores from ESPN and updates your Supabase DB.
- **Real-time**: Instead of a costly Socket server, we use **Supabase Realtime**. When the API updates the database, Supabase pushes those changes to all active users instantly.

## 4. (Optional) Auto-Scraping Cron
To keep your stats updated even when no one is on the site:
1. In Vercel, go to the **Cron** tab (if available) or simply use a free service like [Cron-job.org](https://cron-job.org).
2. Set it to hit `https://your-app.vercel.app/api/matches` every 1 or 5 minutes.

---
**Note**: The original `workers/data_scraper.js` is still in the project if you ever want to upgrade to a dedicated VPS for sub-second latency, but for 99% of use cases, this Vercel + Supabase combo is perfect and $0 cost.
