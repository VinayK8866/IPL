'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PerspectiveCamera, Environment, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCricketRealtime } from '../../hooks/useCricketRealtime';
import { BallData } from '../../lib/data-engine/types';

/**
 * PROJECT CRICKET PULSE - 3D PITCH MAP
 * 
 * High-adrenaline, arcade-style visualization of recent deliveries.
 * Optimized with React.memo to prevent Canvas re-renders.
 */

interface BallSphereProps {
  ball: BallData;
  index: number;
}

const BallSphere = React.memo(({ ball, index }: BallSphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Floating animation for a more 'arcade' feel
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = (ball.z || 0) + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
    }
  });

  const ballColor = ball.is_wicket ? '#FF3366' : (ball.type === 'spin' ? '#7A3FE1' : '#FFD700');
  
  // x: -1.5 to 1.5 across width
  // y: -8.8 to 8.8 between creases (17.6m pitch length effective)
  const posX = ((ball.x || 0) * 3) - 1.5;
  const posZ = ((ball.y || 0) * 17.6) - 8.8;

  return (
    <mesh ref={meshRef} position={[posX, (ball.z || 0) + 0.1, posZ]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial 
        color={ballColor} 
        emissive={ballColor} 
        emissiveIntensity={2} 
        roughness={0}
      />
      {/* Visual pulse for the latest ball */}
      {index === 0 && (
        <mesh scale={[1.5, 1.5, 1.5]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial color={ballColor} transparent opacity={0.2} />
        </mesh>
      )}
    </mesh>
  );
});
BallSphere.displayName = 'BallSphere';

const PitchGeometry = React.memo(() => {
  return (
    <group>
      {/* Pitch Surface - Stylized Techi Texture */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]}>
        <planeGeometry args={[3, 22]} />
        <meshStandardMaterial 
          color="#05070A" 
          emissive="#7A3FE1" 
          emissiveIntensity={0.05} 
          roughness={1}
        />
      </mesh>
      
      {/* Pitch Grid / Markings */}
      <gridHelper args={[22, 11, 0x7A3FE1, 0x1A1F29]} rotation-x={-Math.PI / 2} position={[0, 0, 0]} />
      
      {/* Crease Markings - Neon Gold */}
      <mesh position={[0, 0.01, 8.8]}>
        <planeGeometry args={[3, 0.1]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
      <mesh position={[0, 0.01, -8.8]}>
        <planeGeometry args={[3, 0.1]} />
        <meshBasicMaterial color="#FFD700" />
      </mesh>
    </group>
  );
});
PitchGeometry.displayName = 'PitchGeometry';

const PitchScene = React.memo(({ balls }: { balls: BallData[] }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={40} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#7A3FE1" />
      
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      
      <PitchGeometry />
      
      {balls.map((ball, i) => (
        <BallSphere key={ball.timestamp} ball={ball} index={i} />
      ))}
      
      {/* Delivery Path visualization for the latest ball */}
      {balls.length > 0 && (
        <Line 
          points={[[0, 2, -10], [(balls[0].x || 0) * 2 - 1, balls[0].z || 0.1, (balls[0].y || 0) * 10 - 5]]}
          color="#FF3366"
          lineWidth={1}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      )}
    </>
  );
});
PitchScene.displayName = 'PitchScene';

export const PitchMap3D = React.memo(({ matchId }: { matchId: string }) => {
  const { score } = useCricketRealtime(matchId);
  
  // Fallback balls for initial display
  const fallbackBalls: BallData[] = [
    { x: 0.5, y: 0.8, z: 0.2, type: 'pace', is_wicket: false, timestamp: '1' },
    { x: 0.4, y: 0.75, z: 0.15, type: 'spin', is_wicket: false, timestamp: '2' },
    { x: 0.6, y: 0.85, z: 0.3, type: 'pace', is_wicket: true, timestamp: '3' },
  ];

  const currentBalls = score?.last_balls || fallbackBalls;
  const validBalls = useMemo(() => {
    return currentBalls.filter(b => b.x !== undefined && b.y !== undefined);
  }, [currentBalls]);

  return (
    <div className="w-full h-[400px] bg-[#0B0E14] border border-white/5 relative overflow-hidden group select-none">
      <div className="absolute top-4 left-4 z-10 flex flex-col pointer-events-none">
        <h3 className="text-[10px] font-black text-[#7A3FE1] tracking-[0.3em] uppercase mb-1">Live Delivery Map</h3>
        <span className="text-[9px] font-bold text-gray-500 italic">Tracking Last 6 Balls | Sync Enabled</span>
      </div>

      <Canvas 
        shadows 
        gl={{ antialias: true, stencil: false, depth: true }}
        dpr={[1, 2]} // Performance: Limit DPR on power-dense screens
      >
        <PitchScene balls={validBalls} />
      </Canvas>

      {/* Retro Arcade Vignette Effect */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-5" />
    </div>
  );
});
PitchMap3D.displayName = 'PitchMap3D';

export default PitchMap3D;
