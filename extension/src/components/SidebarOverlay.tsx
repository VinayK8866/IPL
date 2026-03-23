import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSync } from '../store';
import SyncController from '../content-scripts/SyncController';

/**
 * PROJECT CRICKET PULSE - SIDEBAR OVERLAY
 * 
 * High-performance, React-based Shadow DOM sidebar.
 * Adheres to the 'Anti-SaaS' Cyber-Sport aesthetic.
 */

const SidebarOverlay: React.FC = React.memo(() => {
  const [isOpen, setIsOpen] = useState(true);
  const { matchDelayOffset } = useSync();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="overlay-sidebar"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            height: '100vh',
            width: '400px',
            backgroundColor: '#0B0E14',
            borderLeft: '2px solid transparent',
            borderImage: 'linear-gradient(to bottom, #7C3AED, #F59E0B, #EC4899) 1',
            zIndex: 2147483647,
            padding: '2rem',
            color: '#FFFFFF',
            fontFamily: "'Outfit', sans-serif",
            userSelect: 'none',
            overflowY: 'auto'
          }}
        >
          {/* Header Section */}
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
              margin: 0
            }}>
              PULSE.LIVE
            </h1>
            <button 
              onClick={() => setIsOpen(false)}
              aria-label="Close Overlay"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer',
                padding: '0.5rem 0.75rem',
                borderRadius: '0px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Sync Stats Section */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(236, 72, 153, 0.05))',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              padding: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '4px',
                height: '100%',
                background: '#7C3AED'
              }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', fontWeight: 800 }}>Client Engine Sync</p>
                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', fontStyle: 'italic' }}>
                    {(matchDelayOffset / 1000).toFixed(1)}s
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', fontWeight: 800 }}>Broadcaster</p>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%' }} /> SYNCED
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Controller Component */}
          <SyncController />

          {/* Visualization Placeholder */}
          <div style={{ marginTop: '3rem' }}>
            <div style={{ 
              height: '150px', 
              border: '1px dashed rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(255,255,255,0.02)'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Awaiting Momentum Engine...</p>
            </div>
          </div>
          
          <style>{`
            #overlay-sidebar::-webkit-scrollbar {
              width: 0px;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default SidebarOverlay;
