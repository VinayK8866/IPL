'use client';

import React, { createContext, useContext, useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLatencySync } from '@/lib/hooks/useLatencySync';

/**
 * PROJECT CRICKET PULSE - VFX GLOBAL PROVIDER
 * 
 * Manages global uniforms for all shaders (e.g., uTime, uResolution, uGlobalHype).
 * Handles synchronized visual triggers that respect the match_delay_offset.
 */

interface VFXContextType {
  uniforms: {
    uTime: { value: number };
    uResolution: { value: THREE.Vector2 };
    uGlobalHype: { value: number };
  };
  triggerExplosion: (type: 'four' | 'six' | 'wicket', teamColor: string) => void;
  activeExplosion: { type: 'four' | 'six' | 'wicket'; teamColor: string; id: number } | null;
}

const VFXContext = createContext<VFXContextType | undefined>(undefined);

export const VFXProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncDelay } = useLatencySync();
  const [activeExplosion, setActiveExplosion] = useState<{ type: 'four' | 'six' | 'wicket'; teamColor: string; id: number } | null>(null);

  // Global uniforms to be shared across all shader materials
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(typeof window !== 'undefined' ? window.innerWidth : 1920, typeof window !== 'undefined' ? window.innerHeight : 1080) },
    uGlobalHype: { value: 0.5 }
  }), []);

  // Use R3F update loop to update global time uniform (if available)
  // For standard React components, we use requestAnimationFrame
  useEffect(() => {
    let frameId: number;
    const update = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [uniforms]);

  // Synchronized trigger system
  const triggerExplosion = (type: 'four' | 'six' | 'wicket', teamColor: string) => {
    // Pipe the visual trigger through the global sync delay
    syncDelay(() => {
      setActiveExplosion({ type, teamColor, id: Date.now() });
      
      // Auto-clear after duration to allow re-triggering
      setTimeout(() => {
        setActiveExplosion(null);
      }, 5000); 
    });
  };

  return (
    <VFXContext.Provider value={{ uniforms, triggerExplosion, activeExplosion }}>
      {children}
    </VFXContext.Provider>
  );
};

export const useVFX = () => {
  const context = useContext(VFXContext);
  if (!context) throw new Error('useVFX must be used within VFXProvider');
  return context;
};
