precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uTeamColor;
uniform float uType; // 0=four, 1=six, 2=wicket

varying vec2 vUv;

// PROJECT CRICKET PULSE - EVENT EXPLOSION SHADER
// High-intensity GLSL explosion triggered by match events.
// Use 'match_delay_offset' gated triggers to ensure broadcast sync.

float sdfCircle(vec2 p, float r) {
    return length(p) - r;
}

void main() {
    float t = mod(uTime, 3.0); // Reset for duration
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);

    // Initial Expanding Ring
    float radius = t * 1.5;
    float ringThickness = 0.05 / t;
    float ringStrength = smoothstep(radius + ringThickness, radius, d) * 
                        smoothstep(radius - ringThickness, radius, d);

    // Dynamic Spark Particles
    float angle = atan(p.y, p.x);
    float sparks = sin(angle * 12.0 + t * 5.0) * cos(angle * 4.0 - t * 10.0);
    float sparkStrength = step(0.1, sparks) * exp(-abs(d - radius) * 5.0) / t;

    // Boundary Type Variations (Four vs Six vs Wicket)
    vec3 baseColor = uTeamColor;
    if (uType == 1.0) { // Six - Neon Pink Blast
        baseColor = mix(baseColor, vec3(1.0, 0.2, 0.4), 0.5);
    } else if (uType == 2.0) { // Wicket - Ashy Grey/Death
        baseColor = mix(baseColor, vec3(0.5), 0.7);
    }

    // High Intensity Flash Core
    float core = exp(-d * 4.0 / t) * 1.2;
    
    // Combine Effects
    float finalAlpha = (ringStrength + sparkStrength + core) * exp(-t * 1.5);
    vec3 finalColor = baseColor * (ringStrength * 2.0 + sparkStrength * 3.0 + core * 5.0);

    gl_FragColor = vec4(finalColor, finalAlpha);
}
