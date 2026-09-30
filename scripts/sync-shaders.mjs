import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = new URL('../src/ribbon.frag', import.meta.url);
const metalPath = new URL('../native/SiriRibbon.metal', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const code = source.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
if (/\b(?:sampler\w*|texture\w*|texelFetch\w*)\b/.test(code)) {
  throw new Error('The ribbon must remain procedural: sampled textures are not supported.');
}

let body = source.slice(source.indexOf('float gaussian'), source.indexOf('void main()'));
body = body
  .replaceAll('vec2', 'float2')
  .replaceAll('vec3', 'float3')
  .replace('float time) {', 'float time, constant RibbonUniforms &u) {');
for (const name of ['Intensity', 'Height', 'Dispersion', 'Bloom', 'Full']) {
  body = body.replaceAll(`u${name}`, `u.${name.toLowerCase()}`);
}
body = body.replace(/(?<!\w)(-?\d+\.\d+)\b/g, '$1f');

const metal = `// Generated from src/ribbon.frag by npm run sync:shaders.
#include <metal_stdlib>
using namespace metal;

struct RibbonUniforms {
    float2 resolution;
    float time, intensity, height, dispersion, bloom, full;
};

${body}
kernel void siriRibbon(texture2d<float, access::write> output [[texture(0)]],
                       constant RibbonUniforms &u [[buffer(0)]],
                       uint2 gid [[thread_position_in_grid]]) {
    if (gid.x >= output.get_width() || gid.y >= output.get_height()) return;
    float2 uv = (float2(gid) + 0.5f) / u.resolution;
    output.write(float4(ribbon(uv, u.time, u), 1.0f), gid);
}
`;

if (process.argv.includes('--check')) {
  if (await readFile(metalPath, 'utf8') !== metal) {
    throw new Error('Metal source is out of sync. Run npm run sync:shaders.');
  }
  console.log('GLSL and Metal are in sync; no sampled textures.');
} else {
  await writeFile(metalPath, metal);
  console.log('Updated native/SiriRibbon.metal.');
}
