'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Note: In a production Next.js environment, the fragment shader should be imported as a string
// or using a loader. For this implementation, the shader source is provided in cyber_bg.frag.
const FRAGMENT_SHADER = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uGlobalHype;

varying vec2 vUv;

#define PI 3.14159265359

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float pulse = sin(uTime * 0.5 + uGlobalHype * 10.0) * 0.1 + 0.9;
    vec3 color = vec3(0.043, 0.055, 0.078); 
    
    float d = length(p);
    float wave = sin(d * 10.0 - uTime * 2.0) * 0.5 + 0.5;
    
    vec3 purple = vec3(0.478, 0.247, 0.882);
    float purpleIntensity = smoothstep(0.8 * pulse, 0.2, d) * wave;
    color = mix(color, purple, purpleIntensity * 0.15);

    vec3 pink = vec3(1.0, 0.2, 0.4);
    float pinkNoise = noise(p + uTime * 0.1) * 0.05;
    color += pink * pinkNoise * step(0.9, sin(d * 5.0 - uTime));

    float scanline = sin(vUv.y * 800.0) * 0.04;
    color -= scanline;

    gl_FragColor = vec4(color, 1.0);
}
`;

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BackgroundMesh = React.memo(() => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uGlobalHype: { value: 0.5 }
  }), [size.width, size.height]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh scale={[size.width, size.height, 1]}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
      />
    </mesh>
  );
});

export const CyberBackground: React.FC = React.memo(() => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#0B0E14]">
      <Canvas
        camera={{ position: [0, 0, 1], fov: 75 }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
      >
        <BackgroundMesh />
      </Canvas>
    </div>
  );
});

CyberBackground.displayName = 'CyberBackground';
BackgroundMesh.displayName = 'BackgroundMesh';
