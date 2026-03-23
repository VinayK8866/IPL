precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uGlobalHype;

varying vec2 vUv;

// PROJECT CRICKET PULSE - CYBER BACKGROUND SHADER
// High-performance simplex noise to drive the 'mesmerizing' dashboard depth.
// Colors: Deep Navy (#0B0E14), Electric Purple, Gold, Neon Pink.

#define PI 3.14159265359

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    // Pulse based on global hype
    float pulse = sin(uTime * 0.5 + uGlobalHype * 10.0) * 0.1 + 0.9;
    
    // Gradient Core - Deep Navy #0B0E14
    vec3 color = vec3(0.043, 0.055, 0.078); 
    
    // Dynamic noise 'waves'
    float d = length(p);
    float wave = sin(d * 10.0 - uTime * 2.0) * 0.5 + 0.5;
    
    // Purple Aura (#7A3FE1)
    vec3 purple = vec3(0.478, 0.247, 0.882);
    float purpleIntensity = smoothstep(0.8 * pulse, 0.2, d) * wave;
    color = mix(color, purple, purpleIntensity * 0.15);

    // Neon Pink Highlights (#FF3366)
    vec3 pink = vec3(1.0, 0.2, 0.4);
    float pinkNoise = noise(p + uTime * 0.1) * 0.05;
    color += pink * pinkNoise * step(0.9, sin(d * 5.0 - uTime));

    // Scant line effect for 'Cyber-Sport' intensity
    float scanline = sin(vUv.y * 800.0) * 0.04;
    color -= scanline;

    gl_FragColor = vec4(color, 1.0);
}
