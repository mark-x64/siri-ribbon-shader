#version 300 es
precision highp float;
// Pure analytic light: no samplers, textures, frame buffers or reference pixels.
// A displaced RGB light ribbon plus its wider optical diffusion.
// All fitted values are low-order geometry / light parameters, not frame data.
uniform vec2 uResolution;
uniform float uTime, uIntensity, uHeight, uDispersion, uBloom, uFull;
out vec4 fragColor;

float gaussian(float x) { return exp(-0.5 * x * x); }

vec3 ribbon(vec2 uv, float time) {
    float z = time * 6.100180;
    vec3 cycle = vec3(1.0, sin(z), cos(z));
    // d(phase)/dt stays positive: the wave travels from right to left.
    float phase = -4.824537 + z + 0.371364 * sin(z) + -0.304856 * (cos(z) - 1.0) + 0.010850 * sin(2.0 * z);
    float baseline = dot(vec3(0.726896, 0.002852, 0.003134), cycle);
    float amplitude = dot(vec3(0.158162, -0.002412, 0.002027), cycle);
    float frequency = dot(vec3(4.570563, 0.120447, 0.125378), cycle);
    float tilt = dot(vec3(0.012385, -0.033358, 0.003878), cycle);
    float redPhase = dot(vec3(-0.394510, 0.013870, 0.017730), cycle);
    float bluePhase = dot(vec3(0.503310, 0.003127, 0.046292), cycle);
    float redWidth = dot(vec3(0.109624, -0.011169, 0.029950), cycle);
    float greenWidth = dot(vec3(0.103850, -0.012551, 0.030449), cycle);
    float blueWidth = dot(vec3(0.102429, -0.011292, 0.029249), cycle);
    float redEnergy = dot(vec3(0.726313, 0.100913, 0.100206), cycle);
    float greenEnergy = dot(vec3(0.758115, 0.100969, 0.085402), cycle);
    float blueEnergy = dot(vec3(0.791408, 0.070306, 0.070721), cycle);
    float lightCenter = dot(vec3(0.675112, -0.016285, 0.050804), cycle);
    float lightRadius = dot(vec3(0.351151, -0.041723, 0.036320), cycle);
    float diffusion = dot(vec3(0.375303, 0.116438, -0.130536), cycle);
    float coreEnergy = dot(vec3(0.024771, -0.009025, 0.005595), cycle);
    float coreWidth = dot(vec3(0.051309, -0.016287, 0.001463), cycle);
    float widthWave = dot(vec3(0.108698, -0.002688, -0.305189), cycle);
    float asymmetry = dot(vec3(0.008941, 0.034254, 0.014939), cycle);
    float secondHarmonic = dot(vec3(-0.002633, 0.002816, 0.000144), cycle);
    // Broaden the same light field; lose the white core as its energy spreads.
    float dissolve = uFull * smoothstep(1.076589, 1.518624, time);
    float expansion = 1.0 + dissolve * 3.623702;
    float fade = 1.0;
    if (uFull > 0.5) fade = exp(-5.766464 * max(time - 1.142785, 0.0));
    phase += 0.528093 * dissolve;
    baseline += -0.051802 * dissolve;
    lightCenter += -0.064073 * dissolve;
    lightRadius += 0.090304 * dissolve;
    amplitude *= uHeight;
    vec3 shifts = vec3(redPhase, 0.0, bluePhase) * uDispersion * (1.0 + dissolve * 3.117125);
    vec3 widths = max(vec3(redWidth, greenWidth, blueWidth), vec3(0.008)) * expansion;
    vec3 energies = max(vec3(redEnergy, greenEnergy, blueEnergy), vec3(0.0));
    float theta = frequency * uv.x + phase;
    float light = gaussian((uv.x - lightCenter) / max(lightRadius, 0.008));
    float commonY = baseline + amplitude * sin(theta) + tilt * (uv.x - 0.5) + secondHarmonic * sin(2.0 * theta);
    float whiteCore = max(coreEnergy, 0.0) * gaussian((uv.y - commonY) / max(coreWidth * expansion, 0.008));
    whiteCore *= exp(2.864576 * sin(theta) + -0.034796 * cos(theta)) * (1.0 - 1.000000 * dissolve);
    vec3 color = vec3(0.0);
    for (int channel = 0; channel < 3; channel++) {
        float angle = theta + shifts[channel];
        float centerY = baseline + amplitude * sin(angle) + tilt * (uv.x - 0.5) + secondHarmonic * sin(2.0 * angle);
        float distanceY = uv.y - centerY;
        float width = widths[channel] * (1.0 + clamp(widthWave, -0.75, 0.75) * sin(angle));
        width *= exp(asymmetry * tanh(distanceY / 0.12));
        float source = gaussian(distanceY / width);
        float glow = max(diffusion, 0.0) * gaussian(distanceY / (width * 3.0));
        vec3 densitySin = vec3(0.001207, -0.066348, -0.134531);
        vec3 densityCos = vec3(-0.143807, -0.134067, -0.073692);
        float density = exp(densitySin[channel] * sin(angle) + densityCos[channel] * cos(angle));
        color[channel] = (energies[channel] * density * (source + uBloom * glow) + whiteCore) * light;
    }
    return clamp(color * uIntensity * fade, 0.0, 1.0);
}
void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;
    uv.y = 1.0 - uv.y;
    fragColor = vec4(ribbon(uv, uTime), 1.0);
}
