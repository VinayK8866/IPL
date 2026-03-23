/**
 * PROJECT CRICKET PULSE - BROADCAST SYNC OVERLAY
 * 
 * Logic to sync visual triggers with TV/Stream lag.
 */

console.log('--- CRICKET PULSE OVERLAY LOADED ---');

let syncOffset = 5000; // Default 5 seconds lag

chrome.storage.local.get(['match_delay_offset'], (result) => {
  if (result.match_delay_offset) {
    syncOffset = result.match_delay_offset;
    console.log(`Sync Offset set to ${syncOffset}ms`);
  }
});

/**
 * Handle Real-time Triggers
 * These would normally come from a WebSocket or message from background script.
 */
function handleVisualTrigger(eventData) {
  const triggerType = eventData.type; // 4, 6, WICKET
  
  console.log(`Queuing trigger ${triggerType} for ${syncOffset}ms...`);

  setTimeout(() => {
    // Inject Shadow DOM Element or Overlay
    const overlay = document.createElement('div');
    overlay.id = 'cricket-pulse-overlay';
    overlay.innerHTML = `<div class="pulse-burst">BALL: ${triggerType}</div>`;
    
    // Applying Cyber-Sport styles (this would come from a Shadow DOM with theme.css)
    document.body.appendChild(overlay);

    // Auto-remove after animation
    setTimeout(() => {
        overlay.remove();
    }, 3000);
  }, syncOffset);
}

// MOCK: Simulate a '6' hit on TV after sync delay
// window.addEventListener('message', (e) => handleVisualTrigger(e.data));
