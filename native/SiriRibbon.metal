// Generated from src/ribbon.frag by npm run sync:shaders.
#include <metal_stdlib>
using namespace metal;

struct RibbonUniforms {
    float2 resolution;
    float time, intensity, height, dispersion, bloom, full;
};

float gaussian(float x) { return exp(-0.5f * x * x); }

float3 ribbon(float2 uv, float time, constant RibbonUniforms &u) {
    float z = time * 6.100180f;
    float3 cycle = float3(1.0f, sin(z), cos(z));
    // d(phase)/dt stays positive: the wave travels from right to left.
    float phase = -4.824537f + z + 0.371364f * sin(z) + -0.304856f * (cos(z) - 1.0f) + 0.010850f * sin(2.0f * z);
    float baseline = dot(float3(0.726896f, 0.002852f, 0.003134f), cycle);
    float amplitude = dot(float3(0.158162f, -0.002412f, 0.002027f), cycle);
    float frequency = dot(float3(4.570563f, 0.120447f, 0.125378f), cycle);
    float tilt = dot(float3(0.012385f, -0.033358f, 0.003878f), cycle);
    float redPhase = dot(float3(-0.394510f, 0.013870f, 0.017730f), cycle);
    float bluePhase = dot(float3(0.503310f, 0.003127f, 0.046292f), cycle);
    float redWidth = dot(float3(0.109624f, -0.011169f, 0.029950f), cycle);
    float greenWidth = dot(float3(0.103850f, -0.012551f, 0.030449f), cycle);
    float blueWidth = dot(float3(0.102429f, -0.011292f, 0.029249f), cycle);
    float redEnergy = dot(float3(0.726313f, 0.100913f, 0.100206f), cycle);
    float greenEnergy = dot(float3(0.758115f, 0.100969f, 0.085402f), cycle);
    float blueEnergy = dot(float3(0.791408f, 0.070306f, 0.070721f), cycle);
    float lightCenter = dot(float3(0.675112f, -0.016285f, 0.050804f), cycle);
    float lightRadius = dot(float3(0.351151f, -0.041723f, 0.036320f), cycle);
    float diffusion = dot(float3(0.375303f, 0.116438f, -0.130536f), cycle);
    float coreEnergy = dot(float3(0.024771f, -0.009025f, 0.005595f), cycle);
    float coreWidth = dot(float3(0.051309f, -0.016287f, 0.001463f), cycle);
    float widthWave = dot(float3(0.108698f, -0.002688f, -0.305189f), cycle);
    float asymmetry = dot(float3(0.008941f, 0.034254f, 0.014939f), cycle);
    float secondHarmonic = dot(float3(-0.002633f, 0.002816f, 0.000144f), cycle);
    // Broaden the same light field; lose the white core as its energy spreads.
    float dissolve = u.full * smoothstep(1.076589f, 1.518624f, time);
    float expansion = 1.0f + dissolve * 3.623702f;
    float fade = 1.0f;
    if (u.full > 0.5f) fade = exp(-5.766464f * max(time - 1.142785f, 0.0f));
    phase += 0.528093f * dissolve;
    baseline += -0.051802f * dissolve;
    lightCenter += -0.064073f * dissolve;
    lightRadius += 0.090304f * dissolve;
    amplitude *= u.height;
    float3 shifts = float3(redPhase, 0.0f, bluePhase) * u.dispersion * (1.0f + dissolve * 3.117125f);
    float3 widths = max(float3(redWidth, greenWidth, blueWidth), float3(0.008f)) * expansion;
    float3 energies = max(float3(redEnergy, greenEnergy, blueEnergy), float3(0.0f));
    float theta = frequency * uv.x + phase;
    float light = gaussian((uv.x - lightCenter) / max(lightRadius, 0.008f));
    float commonY = baseline + amplitude * sin(theta) + tilt * (uv.x - 0.5f) + secondHarmonic * sin(2.0f * theta);
    float whiteCore = max(coreEnergy, 0.0f) * gaussian((uv.y - commonY) / max(coreWidth * expansion, 0.008f));
    whiteCore *= exp(2.864576f * sin(theta) + -0.034796f * cos(theta)) * (1.0f - 1.000000f * dissolve);
    float3 color = float3(0.0f);
    for (int channel = 0; channel < 3; channel++) {
        float angle = theta + shifts[channel];
        float centerY = baseline + amplitude * sin(angle) + tilt * (uv.x - 0.5f) + secondHarmonic * sin(2.0f * angle);
        float distanceY = uv.y - centerY;
        float width = widths[channel] * (1.0f + clamp(widthWave, -0.75f, 0.75f) * sin(angle));
        width *= exp(asymmetry * tanh(distanceY / 0.12f));
        float source = gaussian(distanceY / width);
        float glow = max(diffusion, 0.0f) * gaussian(distanceY / (width * 3.0f));
        float3 densitySin = float3(0.001207f, -0.066348f, -0.134531f);
        float3 densityCos = float3(-0.143807f, -0.134067f, -0.073692f);
        float density = exp(densitySin[channel] * sin(angle) + densityCos[channel] * cos(angle));
        color[channel] = (energies[channel] * density * (source + u.bloom * glow) + whiteCore) * light;
    }
    return clamp(color * u.intensity * fade, 0.0f, 1.0f);
}

kernel void siriRibbon(texture2d<float, access::write> output [[texture(0)]],
                       constant RibbonUniforms &u [[buffer(0)]],
                       uint2 gid [[thread_position_in_grid]]) {
    if (gid.x >= output.get_width() || gid.y >= output.get_height()) return;
    float2 uv = (float2(gid) + 0.5f) / u.resolution;
    output.write(float4(ribbon(uv, u.time, u), 1.0f), gid);
}
