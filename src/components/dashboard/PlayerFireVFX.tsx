'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PROJECT CRICKET PULSE - PLAYER 'ON-FIRE' VFX WRAPPER
 * 
 * A high-performance Framer Motion wrapper that adds a "Cyber-Sport" neon flame aura 
 * to player avatars/cards. Optimized with React.memo to prevent unnecessary re-renders.
 * 
 * Visual Style:
 * - Neon Pink (#FF3366), Electric Purple (#7A3FE1), and Gold (#FFD700) 
 * - Skewed, non-rounded "Aggressive" UI patterns.
 * - GPU-accelerated transforms and drop-shadow filters.
 */

interface PlayerFireVFXProps {
  isGlowing: boolean;
  intensity: number; // 0 to 1
  children: React.ReactNode;
}

export const PlayerFireVFX = React.memo(({ isGlowing, intensity, children }: PlayerFireVFXProps) => {
  // Variations of Glow based on intensity
  const glowVariants: any = {
    initial: { opacity: 0, scale: 0.95, filter: 'blur(10px) brightness(1)' },
    active: { 
      opacity: 1, 
      scale: 1,
      filter: [
        `drop-shadow(0 0 10px rgba(255, 51, 102, ${0.4 * intensity}))`,
        `drop-shadow(0 0 25px rgba(122, 63, 225, ${0.6 * intensity}))`,
        `drop-shadow(0 0 40px rgba(255, 215, 0, ${0.2 * intensity}))`
      ],
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 1.05,
      filter: 'blur(20px) brightness(0)',
      transition: { duration: 0.3 }
    }
  };

  return (
    <div className="relative group select-none">
      <AnimatePresence>
        {isGlowing && (
          <motion.div
            variants={glowVariants}
            initial="initial"
            animate="active"
            exit="exit"
            className="absolute inset-0 z-0 pointer-events-none overflow-visible"
          >
            {/* Primary Neon Aura - Skewed for aggressive look */}
            <div 
              className="absolute -inset-4 bg-gradient-to-tr from-[#FF3366]/20 via-[#7A3FE1]/10 to-transparent skew-x-[-12deg] skew-y-[2deg] blur-xl"
              style={{ opacity: intensity }}
            />

            {/* Pulsing Core - Gold Accent */}
            <div 
              className="absolute inset-0 border-2 border-[#FFD700]/30 skew-x-[-12deg] animate-pulse"
              style={{ opacity: intensity * 0.5 }}
            />

            {/* Fire Sprite Overlay (Simulated via SVG filters and keyframes) */}
            <div className="absolute -bottom-2 left-0 right-0 h-2/3 pointer-events-none overflow-hidden">
               <div className="fire-flicker-overlay absolute inset-0 bg-gradient-to-t from-[#FF3366] via-[#7A3FE1] to-transparent opacity-40 mix-blend-screen" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content (Avatar/Card) */}
      <div 
        className={`relative z-10 transition-transform duration-300 ${isGlowing ? 'scale-[1.02] skew-x-[-2deg]' : ''}`}
        style={{ 
          filter: isGlowing ? `brightness(1.1) drop-shadow(0 0 5px rgba(255,215,0,${0.3 * intensity}))` : 'none'
        }}
      >
        {children}
      </div>

      <style jsx>{`
        .fire-flicker-overlay {
          mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 100%);
          animation: fire-rise 1.2s infinite ease-out;
          background-size: 200% 200%;
          clip-path: polygon(0% 100%, 10% 80%, 20% 100%, 30% 75%, 40% 100%, 50% 85%, 60% 100%, 70% 70%, 80% 100%, 90% 88%, 100% 100%);
        }

        @keyframes fire-rise {
          0% { transform: translateY(10%) skewX(-5deg) scaleY(1); opacity: 0.3; }
          50% { transform: translateY(0%) skewX(5deg) scaleY(1.2); opacity: 0.6; }
          100% { transform: translateY(10%) skewX(-5deg) scaleY(1); opacity: 0.3; }
        }

        /* Prevent Layout Shifts */
        .group {
            backface-visibility: hidden;
            transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
});

PlayerFireVFX.displayName = 'PlayerFireVFX';
