import React from 'react';
import ReactDOM from 'react-dom/client';
import SidebarOverlay from '../components/SidebarOverlay';
import { SyncProvider } from '../store';
import '../styles/overlay-globals.css';

/**
 * PROJECT CRICKET PULSE - OVERLAY SHELL
 * 
 * Injects a Shadow DOM root into official broadcaster domains.
 * Ensures strict CSS isolation and prevents global contamination.
 */

const MOUNT_ID = 'cricket-pulse-overlay-root';

function init() {
  const existingRoot = document.getElementById(MOUNT_ID);
  if (existingRoot) return;

  // Create the main container that will host the shadow root
  const container = document.createElement('div');
  container.id = MOUNT_ID;
  
  // High z-index to stay above the broadcaster's video player components
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.right = '0';
  container.style.zIndex = '2147483647';
  
  document.body.appendChild(container);

  // Attach the Shadow Root for CSS Isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });
  
  // Create a mount point within the shadow root
  const mountPoint = document.createElement('div');
  mountPoint.id = 'shadow-wrapper';
  shadowRoot.appendChild(mountPoint);

  // Note: For actual production, inline the CSS or use chrome.runtime.getURL
  // For this implementation, the builder will handle CSS injection or we can inject dynamically.
  
  // Mount the React Application
  const root = ReactDOM.createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <SyncProvider>
        <SidebarOverlay />
      </SyncProvider>
    </React.StrictMode>
  );
}

// Initializing based on DOM state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
