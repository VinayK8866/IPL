// content.js
// Injected into: https://www.google.com/search?q=ipl+live+score
// Scrapes the live score widget and forwards data to background.js

// ─── Config ──────────────────────────────────────────────────────────────────
const SCRAPE_INTERVAL_MS = 15000;
let isScrapingDetailed = false; 

// ─── Utility ──────────────────────────────────────────────────────────────────
function log(level, ...args) {
    const ts = new Date().toISOString();
    console[level](`[IPL-CONTENT ${ts}]`, ...args);
}

function safeText(element, fallback = "N/A") {
    if (!element) return fallback;
    return element.textContent?.trim() || fallback;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Tab Navigation ──────────────────────────────────────────────────────────

async function getTabButton(name) {
    // Look for tabs by text content
    const tabs = document.querySelectorAll('li.imso-hide-overflow.tb_l, .GSkImd, [role="tab"], .tb_l');
    for (const tab of tabs) {
        const text = tab.textContent.toUpperCase();
        if (text.includes(name.toUpperCase())) {
            return tab;
        }
    }
    return null;
}

async function switchToTab(name) {
    const tab = await getTabButton(name);
    if (tab) {
        const currentTab = document.querySelector('li.tb_st')?.textContent?.toUpperCase() || "";
        if (currentTab.includes(name.toUpperCase())) return true; // Already there

        log("info", `Switching to tab: ${name}`);
        tab.click();
        await sleep(2000); // Wait for content to render
        return true;
    }
    return false;
}

// ─── Rich Data Extraction ─────────────────────────────────────────────────────

function extractScorecard() {
    const scorecard = [];
    // More robust table selector
    const tables = document.querySelectorAll('.liveresults-sports-immersive__lr-imso-ss-wp-tnp, table[jsname="v08v1e"]');
    
    tables.forEach((table) => {
        const container = table.closest('.liveresults-sports-immersive__lr-imso-ss-wp-pni, [jsname="L9Y5yc"]');
        const teamName = safeText(container?.querySelector('.liveresults-sports-immersive__lr-imso-ss-wp-t-nm, .imspo_tps__t-nm'));
        const batters = [];

        // Extract batters (rows with specific structure)
        table.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 5) {
                const name = safeText(row.querySelector('.imspo_tps__pnm, .liveresults-sports-immersive__lr-imso-ss-wp-p-nm'));
                if (name !== "N/A" && name !== "Batter") {
                    batters.push({
                        name: name,
                        status: safeText(cells[1]),
                        runs: safeText(cells[2]),
                        balls: safeText(cells[3]),
                        fours: safeText(cells[4]),
                        sixes: safeText(cells[5]),
                        sr: safeText(cells[6])
                    });
                }
            }
        });

        if (teamName !== "N/A" || batters.length > 0) {
            scorecard.push({
                team: teamName,
                batters: batters
            });
        }
    });
    return scorecard;
}

function extractCommentary() {
    const commentary = [];
    // Primary: Table based rows (newly discovered)
    const tableRows = document.querySelectorAll('table.imspo_cmt__cmt-ov-con tr, .imspo_cmt__cmt-ov-con tr');
    
    tableRows.forEach(row => {
        const runInd = row.querySelector('.imspo_cmt__cmt-po, .imspo_cmt__ball');
        const textEl = row.querySelector('.imspo_cmt__cmt-ln, .imspo_cmt__cmt-mc-dsc');
        
        if (textEl) {
            const fullText = textEl.textContent.trim();
            const sep = fullText.indexOf(':');
            const over = sep > -1 ? fullText.substring(0, sep).trim() : (row.querySelector('.imspo_cmt__ov-sum-con')?.textContent || "N/A");
            const text = sep > -1 ? fullText.substring(sep + 1).trim() : fullText;

            commentary.push({
                over: over,
                run: safeText(runInd),
                text: text,
                type: runInd?.className.includes('bnd') || safeText(runInd) === '4' || safeText(runInd) === '6' ? 'boundary' : 
                      (runInd?.className.includes('w') || safeText(runInd) === 'W' ? 'wicket' : 'normal')
            });
        }
    });

    // Fallback: List based items
    if (commentary.length === 0) {
        document.querySelectorAll('.imspo_cmt__cmt-mc').forEach(item => {
            const runInd = item.querySelector('.imspo_cmt__cmt-po');
            const desc = item.querySelector('.imspo_cmt__cmt-mc-dsc');
            if (desc) {
                const fullText = desc.textContent.trim();
                const sep = fullText.indexOf(':');
                commentary.push({
                    over: sep > -1 ? fullText.substring(0, sep).trim() : "N/A",
                    run: safeText(runInd),
                    text: sep > -1 ? fullText.substring(sep + 1).trim() : fullText,
                    type: runInd?.className.includes('w') ? 'wicket' : 'normal'
                });
            }
        });
    }

    return commentary;
}

// ─── Main Extraction Logic ────────────────────────────────────────────────────

async function extractScoreData() {
    const widget = document.querySelector('.imso_mh__mh-ed') || 
                   document.querySelector('[data-attrid="cricket_scorecard"]') ||
                   document.querySelector('[jsname="cricket"]') ||
                   document.querySelector('.L9Y5yc');

    if (!widget) return null;

    // Team Names
    const teamEls = widget.querySelectorAll('.imso_mh__tm-nm, .imspo_mt__tm-nm, .imspo_tps__t-nm');
    let team1Name = "N/A", team2Name = "N/A";
    if (teamEls.length >= 2) {
        team1Name = safeText(teamEls[0].querySelector('.xNfnlf') || teamEls[0]);
        team2Name = safeText(teamEls[1].querySelector('.xNfnlf') || teamEls[1]);
    }

    // Scores
    const majorScores = widget.querySelectorAll('.imspo_mh_cricket__score-major, .imspo_mt__ms');
    const minorScores = widget.querySelectorAll('.imspo_mh_cricket__score-minor, .imspo_mt__os');
    let team1Score = safeText(majorScores[0]);
    if (minorScores[0]) team1Score += " " + safeText(minorScores[0]);
    let team2Score = majorScores[1] ? (safeText(majorScores[1]) + (minorScores[1] ? " " + safeText(minorScores[1]) : "")) : "Yet to bat";

    const matchStatus = safeText(widget.querySelector('.imspo_mh_cricket__summary-sentence') || widget.querySelector('.imspo_mt__cmd') || widget.querySelector('.imso_mh__v-p'));

    // --- Summary Player Stats ---
    const batters_summary = [];
    const bowlers_summary = [];
    const batterRows = widget.querySelectorAll('.imspo_mh_cricket__tps.imspo_mh_cricket__right-team, .imspo_mh_cricket__tps.imspo_mh_cricket__left-team, [jsname="m6v7te"]');
    batterRows.forEach(row => {
        const spans = row.querySelectorAll('span');
        if (spans.length >= 2) {
            batters_summary.push({
                name: safeText(spans[0]),
                runs: parseInt(safeText(spans[1])) || 0,
                balls: parseInt(safeText(spans[2])) || 0,
                strikeRate: 0
            });
        }
    });

    const bowlerRows = widget.querySelectorAll('.imspo_mh_cricket__tps.imspo_mh_cricket__left-team + div, [jsname="C8V0ne"]');
    bowlerRows.forEach(row => {
        const spans = row.querySelectorAll('span');
        if (spans.length >= 3) {
            bowlers_summary.push({
                name: safeText(spans[0]),
                overs: safeText(spans[1]),
                runs: safeText(spans[2]),
                wickets: safeText(spans[3])
            });
        }
    });

    const last_balls = [];
    widget.querySelectorAll('.imspo_mt__ball, .imspo_cmt__ball, .imspo_cmt__ov-sum-con span, [jsname="fD966b"] span').forEach(ball => {
        const val = safeText(ball);
        if (val !== 'N/A' && val.length < 5 && val !== '|' && val !== 'Recent balls') {
            last_balls.push({ value: val, is_wicket: val.toLowerCase().includes('w') });
        }
    });

    // --- Rich Data Handling ---
    let scorecard = [];
    let commentary = [];

    const hasTabs = document.querySelector('li.imso-hide-overflow.tb_l, .tb_l, [role="tablist"]');
    
    if (hasTabs && !isScrapingDetailed) {
        isScrapingDetailed = true;
        try {
            const originalTab = document.querySelector('li.tb_st')?.textContent?.toUpperCase() || "SUMMARY";
            
            if (await switchToTab("SCORECARD")) {
                scorecard = extractScorecard();
            }
            
            if (await switchToTab("COMMENTARY")) {
                commentary = extractCommentary();
            }
            
            // Return to original view
            await switchToTab(originalTab);
        } catch (err) {
            log("error", "Rich scrape failed:", err);
        } finally {
            isScrapingDetailed = false;
        }
    } else if (!hasTabs) {
        const detailBtn = widget.querySelector('.imso_mh__mh-ed, [aria-label*="Match details"], [jsname="o06Fe"]');
        if (detailBtn) detailBtn.click();
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
    };
}

// ─── Communication & Lifecycle ────────────────────────────────────────────────

async function scrapeAndSend() {
    if (isScrapingDetailed) return;
    const data = await extractScoreData();
    if (data && (data.team1_name !== "N/A" || data.team2_name !== "N/A")) {
        try {
            await chrome.runtime.sendMessage({ type: "SCORE_UPDATE", payload: data });
            log("info", "Data synced.");
        } catch (err) {
            log("error", "Sync failed:", err.message);
        }
    }
}

const interval = setInterval(scrapeAndSend, SCRAPE_INTERVAL_MS);
scrapeAndSend(); // Initial

const observer = new MutationObserver((mutations) => {
    if (isScrapingDetailed) return;
    const relevant = mutations.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && (n.className?.includes?.("imso") || n.className?.includes?.("imspo"))));
    if (relevant) scrapeAndSend();
});

observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener("beforeunload", () => {
    clearInterval(interval);
    observer.disconnect();
});

log("info", "Universal Scraper v2.1 Ready.");