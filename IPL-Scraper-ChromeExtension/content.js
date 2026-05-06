// content.js
// Injected into: https://www.google.com/search?q=ipl+live+score
// Scrapes the live score widget and forwards data to background.js

// ─── Config ──────────────────────────────────────────────────────────────────
const SCRAPE_INTERVAL_MS = 15000;
let isScrapingDetailed = false; // Flag to prevent concurrent detail scraping

// ─── Utility ──────────────────────────────────────────────────────────────────
function log(level, ...args) {
    const ts = new Date().toISOString();
    console[level](`[IPL-CONTENT ${ts}]`, ...args);
}

function safeText(element, fallback = "N/A") {
    return element?.textContent?.trim() || fallback;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Tab Navigation ──────────────────────────────────────────────────────────

async function getTabButton(name) {
    const tabs = document.querySelectorAll('li.imso-hide-overflow.tb_l.GSkImd, .GSkImd, [role="tab"]');
    for (const tab of tabs) {
        if (tab.textContent.toUpperCase().includes(name.toUpperCase())) {
            return tab;
        }
    }
    return null;
}

async function switchToTab(name) {
    const tab = await getTabButton(name);
    if (tab) {
        log("info", `Switching to tab: ${name}`);
        tab.click();
        await sleep(1500); // Wait for content to render
        return true;
    }
    return false;
}

// ─── Rich Data Extraction ─────────────────────────────────────────────────────

function extractScorecard() {
    const scorecard = [];
    const tables = document.querySelectorAll('.liveresults-sports-immersive__lr-imso-ss-wp-tnp');
    
    tables.forEach((table) => {
        const teamName = safeText(table.closest('.liveresults-sports-immersive__lr-imso-ss-wp-pni')?.querySelector('.liveresults-sports-immersive__lr-imso-ss-wp-t-nm'));
        const batters = [];
        const bowlers = [];

        // Extract batters
        table.querySelectorAll('tr.liveresults-sports-immersive__lr-imso-ss-wp-tnr').forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 5) {
                batters.push({
                    name: safeText(cells[0]),
                    status: safeText(cells[1]),
                    runs: safeText(cells[2]),
                    balls: safeText(cells[3]),
                    fours: safeText(cells[4]),
                    sixes: safeText(cells[5]),
                    sr: safeText(cells[6])
                });
            }
        });

        scorecard.push({
            team: teamName,
            batters: batters
        });
    });
    return scorecard;
}

function extractCommentary() {
    const commentary = [];
    const items = document.querySelectorAll('.imspo_cmt__cmt-mc');
    
    items.forEach(item => {
        const runIndicator = item.querySelector('.imspo_cmt__cmt-po');
        const descContainer = item.querySelector('.imspo_cmt__cmt-mc-dsc');
        
        if (descContainer) {
            const fullText = descContainer.textContent.trim();
            // Split "3.5: Text..." into over and text
            const separatorIndex = fullText.indexOf(':');
            const over = separatorIndex > -1 ? fullText.substring(0, separatorIndex).trim() : "N/A";
            const text = separatorIndex > -1 ? fullText.substring(separatorIndex + 1).trim() : fullText;

            commentary.push({
                over: over,
                run: safeText(runIndicator),
                text: text,
                type: runIndicator?.className.includes('bnd') ? 'boundary' : 
                      (runIndicator?.className.includes('w') ? 'wicket' : 'normal')
            });
        }
    });
    return commentary;
}

// ─── Main Extraction Logic ────────────────────────────────────────────────────

async function extractScoreData() {
    // 1. Find main widget
    const widget = document.querySelector('.imso_mh__mh-ed') || 
                   document.querySelector('[data-attrid="cricket_scorecard"]') ||
                   document.querySelector('[jsname="cricket"]');

    if (!widget) return null;

    // 2. Summary Data (Always available)
    const teamEls = widget.querySelectorAll('.imso_mh__tm-nm, .imspo_mt__tm-nm');
    let team1Name = "N/A", team2Name = "N/A";
    if (teamEls.length >= 2) {
        team1Name = safeText(teamEls[0].querySelector('.xNfnlf') || teamEls[0]);
        team2Name = safeText(teamEls[1].querySelector('.xNfnlf') || teamEls[1]);
    }

    const majorScores = widget.querySelectorAll('.imspo_mh_cricket__score-major');
    const minorScores = widget.querySelectorAll('.imspo_mh_cricket__score-minor');
    let team1Score = safeText(majorScores[0]);
    if (minorScores[0]) team1Score += " " + safeText(minorScores[0]);
    let team2Score = majorScores[1] ? (safeText(majorScores[1]) + (minorScores[1] ? " " + safeText(minorScores[1]) : "")) : "Yet to bat";

    const matchStatus = safeText(widget.querySelector('.imspo_mh_cricket__summary-sentence') || widget.querySelector('.imspo_mt__cmd'));

    // --- Legacy / Summary Fields ---
    const batters_summary = [];
    widget.querySelectorAll('.im-batting-stats-row, [class*="batting_stats"] tr').forEach(row => {
        const cells = row.querySelectorAll('td, span');
        if (cells.length >= 3) {
            batters_summary.push({
                name: safeText(cells[0]),
                runs: parseInt(safeText(cells[1])) || 0,
                balls: parseInt(safeText(cells[2])) || 0,
                strikeRate: parseFloat(safeText(cells[3])) || 0
            });
        }
    });

    const last_balls = [];
    widget.querySelectorAll('.imspo_mt__ball, [class*="ball_circle"]').forEach(ball => {
        const val = safeText(ball);
        if (val !== 'N/A' && val.length < 5) {
            last_balls.push({ value: val, is_wicket: val.toLowerCase().includes('w') });
        }
    });

    const bowlers_summary = [];
    widget.querySelectorAll('.imspo_mh_cricket__bowler-row, [class*="bowling_stats"] tr').forEach(row => {
        const cells = row.querySelectorAll('td, span');
        if (cells.length >= 3) {
            bowlers_summary.push({
                name: safeText(cells[0]),
                overs: safeText(cells[1]),
                runs: safeText(cells[2]),
                wickets: safeText(cells[3])
            });
        }
    });

    // 3. Rich Data (If detailed view is open)
    let scorecard = [];
    let commentary = [];

    // Check if we are in detailed view (tabs visible)
    const hasTabs = document.querySelector('li.imso-hide-overflow.tb_l.GSkImd');
    
    if (hasTabs && !isScrapingDetailed) {
        // Only do full rich scrape every few cycles or if data missing
        isScrapingDetailed = true;
        try {
            const currentTab = document.querySelector('li.tb_st')?.textContent?.toUpperCase() || "";
            
            await switchToTab("SCORECARD");
            scorecard = extractScorecard();
            
            await switchToTab("COMMENTARY");
            commentary = extractCommentary();
            
            // Return to original tab or Summary
            if (currentTab && !currentTab.includes("COMMENTARY")) {
                await switchToTab(currentTab.includes("SCORECARD") ? "SCORECARD" : "SUMMARY");
            }
        } catch (err) {
            log("error", "Error during detailed scrape:", err);
        } finally {
            isScrapingDetailed = false;
        }
    } else if (!hasTabs) {
        // If not in detailed view, try to enter it
        const detailTrigger = widget.querySelector('.imso_mh__mh-ed, [aria-label*="Match details"]');
        if (detailTrigger) {
            log("info", "Entering detailed view...");
            detailTrigger.click();
        }
    }

    const today = new Date().toISOString().split("T")[0];
    const matchId = `${team1Name}_vs_${team2Name}_${today}`.replace(/\s+/g, "_").toLowerCase();

    return {
        match_id: matchId,
        team1_name: team1Name,
        team2_name: team2Name,
        team1_score: team1Score,
        team2_score: team2Score,
        match_status: matchStatus,
        batters_json: batters_summary,
        bowlers_json: bowlers_summary, 
        last_balls_json: last_balls,
        scorecard_json: scorecard,
        commentary_json: commentary,
        scraped_at: new Date().toISOString(),
        page_url: window.location.href,
    };
}

// ─── Communication ────────────────────────────────────────────────────────────

async function sendScoreToBackground(scoreData) {
    try {
        if (!chrome.runtime?.id) return;
        await chrome.runtime.sendMessage({ type: "SCORE_UPDATE", payload: scoreData });
        log("info", "Rich score data sent successfully.");
    } catch (err) {
        log("error", "Failed to send to background:", err.message);
    }
}

async function scrapeAndSend() {
    if (isScrapingDetailed) return; // Busy
    const data = await extractScoreData();
    if (data && (data.team1_name !== "N/A" || data.team2_name !== "N/A")) {
        await sendScoreToBackground(data);
    }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

const pollingInterval = setInterval(scrapeAndSend, SCRAPE_INTERVAL_MS);

const observer = new MutationObserver((mutations) => {
    if (isScrapingDetailed) return;
    const relevant = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && n.className?.includes?.("imso")));
    if (relevant) scrapeAndSend();
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener("beforeunload", () => {
    clearInterval(pollingInterval);
    observer.disconnect();
});

// Initial start
setTimeout(scrapeAndSend, 3000);
log("info", "Rich Scraper initialized.");