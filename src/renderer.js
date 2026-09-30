const vertexSource = `#version 300 es
precision highp float;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export function createRenderer(canvas, fragmentSource) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL 2 is unavailable. Try a browser with hardware acceleration enabled.');

  const shaders = [];
  const program = gl.createProgram();

  function dispose() {
    shaders.forEach((shader) => gl.deleteShader(shader));
    gl.deleteProgram(program);
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    gl.attachShader(program, shader);
  }

  try {
    compile(gl.VERTEX_SHADER, vertexSource);
    compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
  } catch (error) {
    dispose();
    throw error;
  }

  const uniforms = Object.fromEntries(
    ['uResolution', 'uTime', 'uIntensity', 'uHeight', 'uDispersion', 'uBloom', 'uFull']
      .map((name) => [name, gl.getUniformLocation(program, name)]),
  );

  function draw(time, settings, fullSequence) {
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * density);
    const height = Math.round(canvas.clientHeight * density);
    if (!width || !height || gl.isContextLost()) return;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uIntensity, settings.intensity);
    gl.uniform1f(uniforms.uHeight, settings.height);
    gl.uniform1f(uniforms.uDispersion, settings.dispersion);
    gl.uniform1f(uniforms.uBloom, settings.bloom);
    gl.uniform1f(uniforms.uFull, fullSequence ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { draw, dispose };
}
