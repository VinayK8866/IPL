'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * PROJECT CRICKET PULSE - PLAYER 'ON-FIRE' SHADER COMPONENT
 * 
 * Powered by custom GLSL for optimized, mesmering intensity.
 * Triggered by strike rate > 200 (min 10 balls).
 */

const FRAGMENT_SHADER = `
precision highp float;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    float t = uTime * 2.0;
    vec2 p = vUv * 2.0 - 1.0;
    p.y += t * 0.5;

    float n = noise(p * 4.0 - t) * 0.5 + noise(p * 8.0 + t * 2.0) * 0.25;
    float mask = smoothstep(1.0, 0.6, abs(vUv.x * 2.0 - 1.0)) * smoothstep(1.0, 0.2, vUv.y);
    
    vec3 gold = vec3(1.0, 0.84, 0.0);
    vec3 purple = vec3(0.478, 0.247, 0.882);
    vec3 pink = vec3(1.0, 0.2, 0.4);

    vec3 fireColor = mix(purple, gold, n * 1.5);
    fireColor = mix(fireColor, pink, step(0.8, n));
    float fireIntensity = (n * 1.5 + 0.2) * mask * uIntensity;
    
    gl_FragColor = vec4(fireColor, fireIntensity * 0.8);
}
`;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const PlayerFireShader: React.FC<{ intensity: number }> = React.memo(({ intensity }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: intensity }
  }), [intensity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <div className="absolute inset-[-20%] z-[-1] pointer-events-none">
      <Canvas 
        gl={{ alpha: true }} 
        dpr={[1, 2]} 
        camera={{ position: [0, 0, 1], fov: 75 }}
      >
        <mesh scale={[2, 2, 1]}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            ref={materialRef}
            uniforms={uniforms}
            vertexShader={VERTEX_SHADER}
            fragmentShader={FRAGMENT_SHADER}
            transparent
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Canvas>
    </div>
  );
});

PlayerFireShader.displayName = 'PlayerFireShader';
