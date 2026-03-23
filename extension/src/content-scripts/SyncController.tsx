import React, { useMemo } from 'react';
import { useSync } from '../store';

/**
 * PROJECT CRICKET PULSE - SYNC CONTROLLER
 * 
 * High-precision latency adjustment component.
 * Features a millisecond-level range slider with zero-radius styling.
 */

const SyncController: React.FC = React.memo(() => {
  const { matchDelayOffset, setMatchDelayOffset } = useSync();

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMatchDelayOffset(parseInt(e.target.value, 10));
  };

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.25rem',
      backgroundColor: '#0B0E14',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* High-Contrast Accent Gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height: '2px',
        width: '100%',
        background: 'linear-gradient(to right, #F59E0B, #EC4899)'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ 
          fontSize: '0.75rem', 
          color: '#888', 
          textTransform: 'uppercase', 
          letterSpacing: '0.12em',
          margin: 0,
          fontWeight: 800
        }}>
          LIVE BROADCAST SYNC
        </h3>
        <span style={{ 
          fontSize: '0.85rem', 
          fontFamily: 'monospace', 
          color: '#F59E0B', 
          fontWeight: 800 
        }}>
          {matchDelayOffset}ms
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="30000" // Up to 30s delay
        step="100" // 100ms precision
        value={matchDelayOffset}
        onChange={handleSliderChange}
        style={{
          width: '100%',
          height: '4px',
          appearance: 'none',
          backgroundColor: 'rgba(255,255,255,0.05)',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
      
      {/* Visual Sliders for aesthetics */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '0.6rem', 
        color: '#444', 
        marginTop: '0.5rem',
        textTransform: 'uppercase'
      }}>
        <span>0s</span>
        <span>15s</span>
        <span>30s</span>
      </div>

      <p style={{ 
        fontSize: '0.65rem', 
        color: '#666', 
        lineHeight: 1.4, 
        marginTop: '1rem',
        fontStyle: 'italic'
      }}>
        Adjust until the stats on the dashboard align with your stream. All triggers are gated by this offset to prevent spoilers.
      </p>

      {/* Styled Inputs / Sliders in Cyber-Sport aesthetic */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #7C3AED;
          border: 1px solid #F59E0B;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
});

export default SyncController;
