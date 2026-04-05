'use client';

import React, { createContext, useContext, useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useLatencySync } from '@/lib/hooks/useLatencySync';

/**
 * PROJECT CRICKET PULSE - VFX GLOBAL PROVIDER
 * 
 * Manages global uniforms and synchronized visual triggers.
 */

interface VFXContextType {
  uniforms: {
    uTime: { value: number };
    uResolution: { value: THREE.Vector2 };
    uGlobalHype: { value: number };
  };
  triggerExplosion: (type: 'four' | 'six' | 'wicket', teamColor: string, eventTime?: number) => void;
  triggerShake: (intensity?: number, duration?: number) => void;
  setAura: (color: string | null) => void;
  activeExplosion: { type: 'four' | 'six' | 'wicket'; teamColor: string; id: number } | null;
  shakeActive: boolean;
  aura: string | null;
}

const VFXContext = createContext<VFXContextType | undefined>(undefined);

export const VFXProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncDelay } = useLatencySync();
  const [activeExplosion, setActiveExplosion] = useState<{ type: 'four' | 'six' | 'wicket'; teamColor: string; id: number } | null>(null);
  const [shakeActive, setShakeActive] = useState(false);
  const [aura, setAura] = useState<string | null>(null);

  // Resolution handling (More stable for SSR/Hydration)
  const [res, setRes] = useState<[number, number]>([1920, 1080]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRes([window.innerWidth, window.innerHeight]);
      const handleResize = () => setRes([window.innerWidth, window.innerHeight]);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(res[0], res[1]) },
    uGlobalHype: { value: 0.5 }
  }), [res]);

  useEffect(() => {
    let frameId: number;
    const update = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      frameId = requestAnimationFrame(update);
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [uniforms]);

  const triggerExplosion = (type: 'four' | 'six' | 'wicket', teamColor: string, eventTime?: number) => {
    syncDelay(() => {
      setActiveExplosion({ type, teamColor, id: Date.now() });
      setTimeout(() => setActiveExplosion(null), 5000); 
    }, eventTime);
  };

  const triggerShake = (intensity = 1, duration = 500) => {
    setShakeActive(true);
    setTimeout(() => setShakeActive(false), duration);
  };

  return (
    <VFXContext.Provider value={{ 
      uniforms, 
      triggerExplosion, 
      triggerShake, 
      setAura, 
      activeExplosion, 
      shakeActive, 
      aura 
    }}>
      {children}
    </VFXContext.Provider>
  );
};

export const useVFX = () => {
  const context = useContext(VFXContext);
  if (!context) throw new Error('useVFX must be used within VFXProvider');
  return context;
};
