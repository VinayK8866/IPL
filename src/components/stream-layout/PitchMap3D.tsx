'use client';

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCricketRealtime } from '@/hooks/useCricketRealtime';
import { BallData } from '@/lib/data-engine/types';

/**
 * STREAM LAYOUT - CINEMATIC PITCH MAP
 * 
 * Optimized for 16:9 OBS capture.
 * Features enhanced emissive effects and high-contrast visuals.
 */

interface BallSphereProps {
  ball: BallData;
  index: number;
}

const BallSphere = React.memo(({ ball, index }: BallSphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = (ball.z || 0) + Math.sin(state.clock.elapsedTime * 3 + index) * 0.15;
      meshRef.current.rotation.y += 0.05;
    }
  });

  const ballColor = ball.is_wicket ? '#FF3366' : (ball.type === 'spin' ? '#7A3FE1' : '#FFD700');
  const posX = (ball.x * 4) - 2;
  const posZ = (ball.y * 18) - 9;

  return (
    <mesh ref={meshRef} position={[posX, (ball.z || 0) + 0.2, posZ]}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial 
        color={ballColor} 
        emissive={ballColor} 
        emissiveIntensity={4} 
        toneMapped={false}
      />
      {index === 0 && (
        <pointLight color={ballColor} intensity={2} distance={5} />
      )}
    </mesh>
  );
});

const PitchBase = React.memo(() => (
  <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, 0]}>
      <planeGeometry args={[4, 24]} />
      <meshStandardMaterial color="#05070A" roughness={0.1} metalness={0.8} />
    </mesh>
    <gridHelper args={[24, 12, 0x7A3FE1, 0x1A1F29]} rotation-x={-Math.PI / 2} />
  </group>
));

import { useMatchData } from '@/providers/MatchDataProvider';

export const StreamPitchMap = React.memo(({ matchId }: { matchId: string }) => {
  const { score } = useMatchData();
  const currentBalls = score?.last_balls || [];

  return (
    <div className="w-full h-full bg-black relative">
      <Canvas shadows gl={{ antialias: true }} dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 16]} fov={35} />
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 10, 0]} intensity={1.5} color="#FF3366" />
        <Stars radius={100} depth={50} count={3000} factor={4} />
        
        <PitchBase />
        
        {currentBalls.map((ball, i) => (
          <BallSphere key={ball.timestamp} ball={ball} index={i} />
        ))}

        {currentBalls.length > 0 && (
          <Line 
            points={[[0, 3, -12], [currentBalls[0].x * 2.5 - 1.25, currentBalls[0].z || 0.2, currentBalls[0].y * 12 - 6]]}
            color="#FFD700"
            lineWidth={2}
            opacity={0.5}
            transparent
          />
        )}
      </Canvas>
      
      {/* Stream Overlay HUD */}
      <div className="absolute top-10 left-10 pointer-events-none">
        <h2 className="text-4xl font-black italic text-white/10 uppercase tracking-[0.5em]">Tactical Feed</h2>
        <div className="h-1 w-32 bg-gradient-to-r from-pink-600 to-transparent mt-2" />
      </div>
    </div>
  );
});

StreamPitchMap.displayName = 'StreamPitchMap';
