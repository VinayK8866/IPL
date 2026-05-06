// config.js
// ============================================================
// SWAP YOUR CREDENTIALS HERE — only file you need to touch
// ============================================================
const CONFIG = {
    SUPABASE_URL: "https://ruafnksvicqndpzulaut.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWZua3N2aWNxbmRwenVsYXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjEwNjQsImV4cCI6MjA4OTQ5NzA2NH0.sEPIQeXCwP0zypPdpfjU8v8MrG7eNM0JBSCUNtNAkrE",

    // Scraping settings
    SCRAPE_INTERVAL_MS: 15000,          // How often content.js polls (ms)
    TAB_RECREATE_DELAY_MS: 30000,       // How long to wait before recreating closed tab
    TARGET_URL: "https://www.google.com/search?q=ipl+live+score",

    // Supabase table name
    TABLE_NAME: "scraped_scores",
};