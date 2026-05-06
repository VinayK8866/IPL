// background.js
// Runs as a Module Service Worker (manifest "type": "module")
// Handles: tab management, Supabase upsert, message listening

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Load Config ────────────────────────────────────────────────────────────
// Service workers cannot import local non-module scripts directly,
// so we inline the config values here (kept in sync with config.js)
const CONFIG = {
    SUPABASE_URL: "https://ruafnksvicqndpzulaut.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YWZua3N2aWNxbmRwenVsYXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjEwNjQsImV4cCI6MjA4OTQ5NzA2NH0.sEPIQeXCwP0zypPdpfjU8v8MrG7eNM0JBSCUNtNAkrE",
    SCRAPE_INTERVAL_MS: 15000,
    TAB_RECREATE_DELAY_MS: 30000,
    TARGET_URL: "https://www.google.com/search?q=ipl+live+score",
    TABLE_NAME: "scraped_scores",
};

// ─── Supabase Client ─────────────────────────────────────────────────────────
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ─── State ───────────────────────────────────────────────────────────────────
let trackedTabId = null;        // Tab ID we're managing
let recreateTimer = null;       // setTimeout handle for tab recreation

// ─── Utility: Log with timestamp ─────────────────────────────────────────────
function log(level, ...args) {
    const ts = new Date().toISOString();
    console[level](`[IPL-BG ${ts}]`, ...args);
}

// ─── Tab Management ──────────────────────────────────────────────────────────

/**
 * Finds an existing Google IPL search tab or creates a new one.
 * The tab is created inactive + pinned to minimize resource usage.
 */
async function ensureIPLTab() {
    // First: check if our tracked tab still exists
    if (trackedTabId !== null) {
        try {
            const tab = await chrome.tabs.get(trackedTabId);
            if (tab && tab.url.includes("ipl")) {
                log("info", `Tab ${trackedTabId} still alive.`);
                return trackedTabId;
            }
        } catch {
            // Tab no longer exists — fall through to search/create
            trackedTabId = null;
        }
    }

    // Second: search for any existing matching tab
    const existingTabs = await chrome.tabs.query({
        url: "https://www.google.com/search*",
    });

    const iplTab = existingTabs.find((t) =>
        t.url.includes("ipl") || t.url.includes("live+score")
    );

    if (iplTab) {
        log("info", `Found existing IPL tab: ${iplTab.id}`);
        trackedTabId = iplTab.id;
        return trackedTabId;
    }

    // Third: create a new tab
    log("info", "No IPL tab found — creating one.");
    const newTab = await chrome.tabs.create({
        url: CONFIG.TARGET_URL,
        active: false,   // Stealth: don't steal user focus
        pinned: true,    // Pinned keeps it compact and separated from user tabs
    });

    trackedTabId = newTab.id;
    log("info", `Created IPL tab: ${trackedTabId}`);
    return trackedTabId;
}

/**
 * Schedules tab recreation after the configured delay.
 * Clears any existing scheduled recreation to avoid duplicates.
 */
function scheduleTabRecreation() {
    if (recreateTimer !== null) {
        clearTimeout(recreateTimer);
    }

    log("warn", `Tab closed. Recreating in ${CONFIG.TAB_RECREATE_DELAY_MS}ms...`);

    recreateTimer = setTimeout(async () => {
        recreateTimer = null;
        trackedTabId = null;
        await ensureIPLTab();
    }, CONFIG.TAB_RECREATE_DELAY_MS);
}

// ─── Supabase Operations ─────────────────────────────────────────────────────

/**
 * Upserts scraped match data into Supabase.
 * Uses match_id as the conflict key so we UPDATE instead of INSERT duplicates.
 *
 * Expected scoreData shape:
 * {
 *   match_id:      string,   // unique identifier for the match
 *   team1_name:    string,
 *   team2_name:    string,
 *   team1_score:   string,
 *   team2_score:   string,
 *   match_status:  string,
 *   batting_team:  string,
 *   scraped_at:    string    // ISO timestamp
 * }
 */
async function upsertMatchData(scoreData) {
    try {
        const { data, error } = await supabase
            .from(CONFIG.TABLE_NAME)
            .upsert(scoreData, {
                onConflict: "match_id",        // Column marked UNIQUE in Supabase
                ignoreDuplicates: false,       // Always update, never silently skip
            })
            .select();                       // Return the upserted row for logging

        if (error) {
            log("error", "Supabase upsert failed:", error.message);
            return { success: false, error: error.message };
        }

        log("info", "Supabase upsert successful:", data);
        return { success: true, data };

    } catch (err) {
        log("error", "Supabase unexpected error:", err);
        return { success: false, error: err.message };
    }
}

// ─── Message Listener ─────────────────────────────────────────────────────────

/**
 * Receives messages from content.js and routes them.
 *
 * Supported message types:
 *   { type: "SCORE_UPDATE", payload: {...} }
 *   { type: "SCRAPE_ERROR", error: "..." }
 *   { type: "PING" }
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log("info", `Message received [${message.type}] from tab ${sender.tab?.id}`);

    // Only accept messages from our managed tab
    if (sender.tab?.id !== trackedTabId) {
        log("warn", `Ignoring message from untracked tab ${sender.tab?.id}`);
        sendResponse({ success: false, reason: "Untracked tab" });
        return false;
    }

    if (message.type === "PING") {
        sendResponse({ success: true, pong: true });
        return false;
    }

    if (message.type === "SCRAPE_ERROR") {
        log("warn", "Content script reported scrape error:", message.error);
        sendResponse({ success: false });
        return false;
    }

    if (message.type === "SCORE_UPDATE") {
        // Must return true to use sendResponse asynchronously
        upsertMatchData(message.payload).then(sendResponse);
        return true;
    }

    sendResponse({ success: false, reason: "Unknown message type" });
    return false;
});

// ─── Tab Event Listeners ──────────────────────────────────────────────────────

// Detect when our tracked tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (tabId === trackedTabId) {
        log("warn", `Tracked tab ${tabId} was closed by user.`);
        trackedTabId = null;
        scheduleTabRecreation();
    }
});

// Detect navigation away from IPL search (e.g., user types in the tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === trackedTabId && changeInfo.url) {
        const stillOnIPL =
            changeInfo.url.includes("google.com") &&
            (changeInfo.url.includes("ipl") || changeInfo.url.includes("live+score"));

        if (!stillOnIPL) {
            log("warn", `Tab ${tabId} navigated away. Recreating...`);
            // Navigate it back instead of creating a new one
            chrome.tabs.update(tabId, { url: CONFIG.TARGET_URL });
        }
    }
});

// ─── Alarm: Keep service worker alive + periodic tab health check ─────────────
// Service Workers sleep after ~30s of inactivity; alarms wake them up

chrome.alarms.create("keepAlive", { periodInMinutes: 0.4 }); // Every ~24s

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "keepAlive") {
        log("info", "Keep-alive alarm fired — checking tab health.");
        await ensureIPLTab();
    }
});

// ─── Initialization ───────────────────────────────────────────────────────────

(async () => {
    log("info", "Background service worker starting...");
    await ensureIPLTab();
    log("info", "Initialization complete.");
})();