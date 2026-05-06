// content.js
// Injected into: https://www.google.com/search?q=ipl+live+score
// Scrapes the live score widget and forwards data to background.js

// ─── Config (mirrored for content script context) ─────────────────────────────
const SCRAPE_INTERVAL_MS = 15000;

// ─── Utility ──────────────────────────────────────────────────────────────────
function log(level, ...args) {
    const ts = new Date().toISOString();
    console[level](`[IPL-CONTENT ${ts}]`, ...args);
}

/**
 * Safely extracts text content from a DOM element.
 * Returns a fallback string if element not found.
 */
function safeText(element, fallback = "N/A") {
    return element?.textContent?.trim() || fallback;
}

/**
 * Safely extracts an attribute from a DOM element.
 */
function safeAttr(element, attr, fallback = "N/A") {
    return element?.getAttribute(attr)?.trim() || fallback;
}

// ─── Score Extraction ─────────────────────────────────────────────────────────

/**
 * Google's cricket widget uses different class structures depending on
 * the match state. We try multiple selector strategies for resilience.
 *
 * IMPORTANT: Google changes class names frequently.
 * Update the selectors below if scraping breaks.
 *
 * Strategy:
 *   1. Try known aria-labels and roles (most stable)
 *   2. Fall back to known class name patterns
 *   3. Return null if widget not found
 */
function extractScoreData() {
    // ── Strategy 1: Find the main cricket widget container ──────────────────
    const widget =
        document.querySelector('.imso_mh__mh-ed') || // Main live card
        document.querySelector('td.liveresults-sports-immersive__match-tile') || // Grid tiles
        document.querySelector('.imso-mg') || // Match group
        document.querySelector('.imspo_mt__mtc-no') || // Another match card variant
        document.querySelector('[data-attrid="cricket_scorecard"]') ||
        document.querySelector('[data-attrid="sports_card"]') ||
        document.querySelector('[jsname="cricket"]') ||
        document.querySelector('[aria-label*="cricket"]');

    if (!widget) {
        return null;
    }

    // ── Strategy 2: Extract team names ──────────────────────────────────────
    // Prefer the containers that hold the names
    const teamEls = widget.querySelectorAll('.imso_mh__tm-nm, .imspo_mt__tm-nm');
    let team1Name = "N/A";
    let team2Name = "N/A";

    if (teamEls.length >= 2) {
        // Try to get the full name from .xNfnlf, fall back to whole text
        team1Name = safeText(teamEls[0].querySelector('.xNfnlf') || teamEls[0]);
        team2Name = safeText(teamEls[1].querySelector('.xNfnlf') || teamEls[1]);
    } else {
        // Fallback to broader selectors
        const teamNameEls = widget.querySelectorAll('.xNfnlf, [data-team]');
        if (teamNameEls.length >= 2) {
            team1Name = safeText(teamNameEls[0]);
            team2Name = safeText(teamNameEls[1]);
        }
    }

    // ── Strategy 3: Extract Scores ──────────────────────────────────────────
    let team1Score = "N/A";
    let team2Score = "N/A";

    const majorScores = widget.querySelectorAll('.imspo_mh_cricket__score-major, .imspo_mt__tt-w');
    const minorScores = widget.querySelectorAll('.imspo_mh_cricket__score-minor');

    if (majorScores.length >= 1) {
        team1Score = safeText(majorScores[0]);
        if (minorScores.length >= 1) team1Score += " " + safeText(minorScores[0]);
    }
    
    if (majorScores.length >= 2) {
        team2Score = safeText(majorScores[1]);
        if (minorScores.length >= 2) team2Score += " " + safeText(minorScores[1]);
    } else {
        // Look for "Yet to bat" or similar placeholders
        const phScore = widget.querySelector('.imspo_mh_cricket__score-ph, .imspo_mt__ms-w');
        if (phScore) team2Score = safeText(phScore);
    }

    // ── Match status ────────────────────────────────────────────────────────
    const statusEl =
        widget.querySelector('.imspo_mh_cricket__summary-sentence') ||
        widget.querySelector('.imspo_mt__cmd') ||
        widget.querySelector('[class*="status"], [class*="match_status"]');

    let matchStatus = safeText(statusEl);

    // ── Batting team ────────────────────────────────────────────────────────
    let battingTeam = "N/A";
    const battingIndicator = widget.querySelector('.imspo_mh_cricket__score-major.imso-ani'); // Often animated if batting
    
    if (battingIndicator) {
        // If the first score is animated, team 1 is batting
        battingTeam = team1Name;
    } else {
        // Infer from score: team with runs/overs is batting
        battingTeam = (team1Score.includes('/') || team1Score.includes('(')) ? team1Name : team2Name;
    }

    // ── Strategy 4: Detailed Player Stats (if available) ────────────────────
    const batters = [];
    const bowlers = [];
    const lastBalls = [];

    // Batter rows
    widget.querySelectorAll('.im-batting-stats-row, [class*="batting_stats"] tr').forEach(row => {
        const cells = row.querySelectorAll('td, span');
        if (cells.length >= 3) {
            batters.push({
                name: safeText(cells[0]),
                runs: parseInt(safeText(cells[1])) || 0,
                balls: parseInt(safeText(cells[2])) || 0,
                strikeRate: parseFloat(safeText(cells[3])) || 0
            });
        }
    });

    // Recent balls
    widget.querySelectorAll('.imspo_mt__ball, [class*="ball_circle"]').forEach(ball => {
        const val = safeText(ball);
        if (val !== 'N/A' && val.length < 5) {
            lastBalls.push({ value: val, is_wicket: val.toLowerCase().includes('w') });
        }
    });

    // ── Construct Match ID ──────────────────────────────────────────────────
    const today = new Date().toISOString().split("T")[0];
    const matchId = `${team1Name}_vs_${team2Name}_${today}`
        .replace(/\s+/g, "_")
        .toLowerCase();

    return {
        match_id: matchId,
        team1_name: team1Name,
        team2_name: team2Name,
        team1_score: team1Score,
        team2_score: team2Score,
        match_status: matchStatus,
        batting_team: battingTeam,
        batters_json: batters.slice(0, 2),
        bowlers_json: bowlers.slice(0, 1),
        last_balls_json: lastBalls.slice(-12),
        scraped_at: new Date().toISOString(),
        page_url: window.location.href,
    };
}


// ─── Send to Background ───────────────────────────────────────────────────────

async function sendScoreToBackground(scoreData) {
    try {
        if (!chrome.runtime?.id) throw new Error("Extension context invalidated.");

        const response = await chrome.runtime.sendMessage({
            type: "SCORE_UPDATE",
            payload: scoreData,
        });

        if (response?.success) {
            log("info", "Score sent and upserted successfully:", scoreData);
        } else {
            log("warn", "Background reported failure:", response);
        }
    } catch (err) {
        if (err.message.includes("context invalidated")) {
            stopScript();
        } else {
            log("error", "Failed to send message to background:", err.message);
        }
    }
}

async function sendError(errorMessage) {
    try {
        if (!chrome.runtime?.id) return;
        await chrome.runtime.sendMessage({
            type: "SCRAPE_ERROR",
            error: errorMessage,
        });
    } catch (err) {
        if (err.message.includes("context invalidated")) {
            stopScript();
        }
    }
}

function stopScript() {
    log("error", "Extension context invalidated. Stopping scraper. Please refresh the page.");
    clearInterval(pollingInterval);
    observer.disconnect();
    clearTimeout(observerDebounceTimer);
}

// ─── Main Scrape Cycle ────────────────────────────────────────────────────────

async function scrapeAndSend() {
    log("info", "Scraping cycle started...");

    const scoreData = extractScoreData();

    if (!scoreData) {
        await sendError("Widget not found or DOM not ready");
        return;
    }

    // Validate: don't send if we got all N/A (widget loaded empty)
    const hasRealData =
        scoreData.team1_name !== "N/A" || scoreData.team2_name !== "N/A";

    if (!hasRealData) {
        log("warn", "Extracted all N/A values — skipping send.");
        await sendError("All values N/A — widget may be loading");
        return;
    }

    await sendScoreToBackground(scoreData);
}

// ─── MutationObserver: React to DOM changes (widget loads async) ──────────────

let observerDebounceTimer = null;

const observer = new MutationObserver((mutations) => {
    // Debounce: wait 1s after last mutation before scraping
    const relevant = mutations.some((m) =>
        [...m.addedNodes].some(
            (n) => n.nodeType === 1 && (
                n.querySelector?.('[class*="cricket"]') ||
                n.querySelector?.('[class*="score"]') ||
                n.querySelector?.('[class*="imso"]') ||
                n.querySelector?.('[class*="imspo"]') ||
                n.className?.includes?.("imso") ||
                n.className?.includes?.("imspo") ||
                n.textContent?.toLowerCase().includes("innings")
            )
        )
    );

    if (relevant) {
        clearTimeout(observerDebounceTimer);
        observerDebounceTimer = setTimeout(() => {
            log("info", "MutationObserver triggered scrape.");
            scrapeAndSend();
        }, 1000);
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
});

// ─── Interval Polling: Backup to MutationObserver ────────────────────────────
// Catches cases where the DOM is static (score updated via XHR without re-render)

const pollingInterval = setInterval(scrapeAndSend, SCRAPE_INTERVAL_MS);

// ─── Cleanup on page unload ───────────────────────────────────────────────────
window.addEventListener("beforeunload", () => {
    observer.disconnect();
    clearInterval(pollingInterval);
    clearTimeout(observerDebounceTimer);
    log("info", "Content script cleaned up.");
});

// ─── Initial scrape on load ───────────────────────────────────────────────────
// Wait 3 seconds for Google's JS to render the widget
setTimeout(() => {
    log("info", "Initial scrape after page load delay.");
    scrapeAndSend();
}, 3000);

log("info", "Content script initialized.");