precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uIntensity;

varying vec2 vUv;

// PROJECT CRICKET PULSE - PLAYER 'ON-FIRE' SHADER
// High-performance animated fire sprite overlay/fragment shader.
// Optimized for strike rates > 200 (min 10 balls).

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.y += uTime * 0.5; // Upward rise

    // Fire Noise Core
    float n = noise(p * 4.0 - uTime * 2.0) * 0.5 + 
             noise(p * 8.0 + uTime * 4.0) * 0.25;

    // Mask for Card Area (Assuming Rectangular)
    float mask = smoothstep(0.9, 0.5, abs(vUv.x * 2.0 - 1.0)) * 
                 smoothstep(1.0, 0.4, vUv.y);

    // Color Gradient: Gold (#FFD700) to Electric Purple (#7A3FE1) to Neon Pink (#FF3366)
    vec3 gold = vec3(1.0, 0.84, 0.0);
    vec3 purple = vec3(0.478, 0.247, 0.882);
    vec3 pink = vec3(1.0, 0.2, 0.4);

    vec3 fireColor = mix(purple, gold, n * 1.5);
    fireColor = mix(fireColor, pink, step(0.8, n));

    float fireIntensity = (n * 1.5 + 0.2) * mask * uIntensity;
    
    // Ghosting effect at the top
    float ghost = exp(-vUv.y * 3.0) * 0.5;
    fireIntensity += ghost * n;

    gl_FragColor = vec4(fireColor, fireIntensity * 0.8);
}
