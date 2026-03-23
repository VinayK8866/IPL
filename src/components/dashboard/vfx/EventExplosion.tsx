'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVFX } from './VFXProvider';

/**
 * PROJECT CRICKET PULSE - EVENT EXPLOSION COMPONENT
 * 
 * High-intensity GLSL explosion VFX for boundaries and wickets.
 * Respects global 'match_delay_offset' for broadcast synchronization.
 */

const FRAGMENT_SHADER = `
precision highp float;
uniform float uTime;
uniform vec3 uTeamColor;
uniform float uType; 
varying vec2 vUv;

void main() {
    float t = mod(uTime, 3.0); 
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);

    float radius = t * 1.5;
    float ringThickness = 0.05 / t;
    float ringStrength = smoothstep(radius + ringThickness, radius, d) * 
                        smoothstep(radius - ringThickness, radius, d);

    float angle = atan(p.y, p.x);
    float sparks = sin(angle * 12.0 + t * 5.0) * cos(angle * 4.0 - t * 10.0);
    float sparkStrength = step(0.1, sparks) * exp(-abs(d - radius) * 5.0) / t;

    vec3 baseColor = uTeamColor;
    if (uType == 1.0) baseColor = mix(baseColor, vec3(1.0, 0.2, 0.4), 0.5);
    else if (uType == 2.0) baseColor = mix(baseColor, vec3(0.5), 0.7);

    float core = exp(-d * 4.0 / t) * 1.2;
    float finalAlpha = (ringStrength + sparkStrength + core) * exp(-t * 1.5);
    vec3 finalColor = baseColor * (ringStrength * 2.0 + sparkStrength * 3.0 + core * 5.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ExplosionMesh = ({ type, teamColor }: { type: 'four' | 'six' | 'wicket'; teamColor: string }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const typeMap = { four: 0.0, six: 1.0, wicket: 2.0 };
  const color = new THREE.Color(teamColor);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTeamColor: { value: color },
    uType: { value: typeMap[type] }
  }), [type, teamColor]);

  return (
    <mesh>
      <planeGeometry args={[5, 10]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export const EventExplosion: React.FC = React.memo(() => {
  const { activeExplosion } = useVFX();

  if (!activeExplosion) return null;

  return (
    <div className="fixed inset-0 z-[50] pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ExplosionMesh 
          key={activeExplosion.id}
          type={activeExplosion.type} 
          teamColor={activeExplosion.teamColor} 
        />
      </Canvas>
    </div>
  );
});

EventExplosion.displayName = 'EventExplosion';
ExplosionMesh.displayName = 'ExplosionMesh';
