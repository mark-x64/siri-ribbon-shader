import { useEffect, useRef, useState } from 'react';
import fragment from './ribbon.frag?raw';
import fragmentUrl from './ribbon.frag?url';
import { createRenderer } from './renderer.js';

const DURATION = 3.533333;
const WAVE_DURATION = 1.03;
const DEFAULTS = { height: 1, dispersion: 1, bloom: 1, intensity: 1 };
const PARAMETERS = [
  { key: 'height', label: 'Amplitude', min: 0.4, max: 1.6 },
  { key: 'dispersion', label: 'Dispersion', min: 0, max: 1.8 },
  { key: 'bloom', label: 'Glow', min: 0, max: 1.8 },
  { key: 'intensity', label: 'Brightness', min: 0.3, max: 1.6 },
];
const REPOSITORY = 'https://github.com/mark-x64/siri-ribbon-shader';
const referenceUrl = `${import.meta.env.BASE_URL}media/reference.mp4`;

export function App() {
  const query = new URLSearchParams(location.search);
  const initialTime = Math.max(0, Math.min(DURATION, Number(query.get('time')) || 0));
  const canvas = useRef(null);
  const video = useRef(null);
  const renderer = useRef(null);
  const position = useRef(initialTime);
  const timeline = useRef(null);
  const timestamp = useRef(null);
  const [compare, setCompare] = useState(!query.has('solo'));
  const [playing, setPlaying] = useState(
    () => !query.has('time') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [sequence, setSequence] = useState('full');
  const [speed, setSpeed] = useState(1);
  const [settings, setSettings] = useState(DEFAULTS);
  const [error, setError] = useState('');
  const [referenceFailed, setReferenceFailed] = useState(false);
  const current = useRef({ settings, sequence });
  current.current = { settings, sequence };
  const duration = sequence === 'full' ? DURATION : WAVE_DURATION;

  useEffect(() => {
    const element = canvas.current;
    function initialize() {
      try {
        renderer.current = createRenderer(element, fragment);
        setError('');
      } catch (cause) {
        setError(cause.message);
      }
    }
    function lost(event) {
      event.preventDefault();
      renderer.current?.dispose();
      renderer.current = null;
      setError('Graphics paused. Waiting for the browser to restore WebGL.');
    }
    initialize();
    element.addEventListener('webglcontextlost', lost);
    element.addEventListener('webglcontextrestored', initialize);
    return () => {
      element.removeEventListener('webglcontextlost', lost);
      element.removeEventListener('webglcontextrestored', initialize);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    let request;
    let previous;
    const reference = video.current;
    if (reference) {
      reference.playbackRate = speed;
      if (playing) reference.play().catch(() => {});
      else reference.pause();
    }

    function frame(now) {
      const elapsed = previous === undefined ? 0 : Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (playing) {
        const canSync = reference && reference.readyState >= 2 && !reference.paused && !reference.seeking;
        position.current = canSync ? reference.currentTime : position.current + elapsed * speed;
        if (position.current >= duration) {
          position.current = 0;
          if (reference) reference.currentTime = 0;
        }
      }
      const { settings: options, sequence: mode } = current.current;
      renderer.current?.draw(position.current, options, mode === 'full');
      if (timeline.current) timeline.current.value = position.current;
      if (timestamp.current) timestamp.current.textContent = `${position.current.toFixed(2)} / ${duration.toFixed(2)} s`;
      request = requestAnimationFrame(frame);
    }

    request = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(request);
  }, [playing, speed, compare, duration]);

  function seek(value) {
    position.current = Math.max(0, Math.min(DURATION, value));
    if (video.current) video.current.currentTime = position.current;
  }

  function inspect(time) {
    setSequence('full');
    setPlaying(false);
    seek(time);
  }

  function restart() {
    seek(0);
    setPlaying(true);
  }

  return (
    <main>
      <header>
        <div>
          <h1>Siri shader</h1>
          <p>An iridescent ribbon in GLSL and Metal.</p>
        </div>
        <a href={REPOSITORY}>GitHub</a>
      </header>

      <div className="view-controls">
        <label className="compare-toggle">
          <input type="checkbox" checked={compare} onChange={(event) => setCompare(event.target.checked)} />
          Compare with reference
        </label>
        <label>
          <span className="visually-hidden">Sequence</span>
          <select value={sequence} onChange={(event) => { setSequence(event.target.value); seek(0); }}>
            <option value="full">Full sequence</option>
            <option value="wave">Wave loop</option>
          </select>
        </label>
      </div>

      <section className={`previews ${compare ? 'comparison' : ''}`} aria-label="Preview">
        {compare && (
          <figure key="reference">
            <figcaption>Reference <span>Apple</span></figcaption>
            <div className="stage">
              <video
                ref={video}
                src={referenceUrl}
                muted
                playsInline
                preload="auto"
                aria-label="Muted reference excerpt"
                onLoadedData={() => {
                  video.current.currentTime = position.current;
                  video.current.playbackRate = speed;
                  if (playing) video.current.play().catch(() => {});
                }}
                onEnded={() => {
                  seek(0);
                  if (playing) video.current?.play().catch(() => {});
                }}
                onError={() => setReferenceFailed(true)}
              />
              {referenceFailed && <p className="stage-message">Reference unavailable. The shader runs independently.</p>}
            </div>
          </figure>
        )}
        <figure key="shader">
          <figcaption>Shader <a href={fragmentUrl}>GLSL source</a></figcaption>
          <div className="stage">
            <canvas ref={canvas} aria-label="Procedural iridescent ribbon" />
            {error && <p className="stage-message" role="alert">{error}</p>}
          </div>
        </figure>
      </section>

      <div className="playback" aria-label="Playback">
        <button className="primary" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={restart}>Restart</button>
        <input
          ref={timeline}
          type="range"
          aria-label="Time"
          min="0"
          max={duration}
          step="0.001"
          defaultValue={initialTime}
          onPointerDown={() => setPlaying(false)}
          onKeyDown={() => setPlaying(false)}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <output ref={timestamp} aria-label="Current time">{initialTime.toFixed(2)} / {duration.toFixed(2)} s</output>
        <select aria-label="Playback speed" value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
        </select>
      </div>

      <div className="keyframes" aria-label="Key moments">
        <span>Jump to</span>
        <button onClick={() => inspect(0.5)}>Wave</button>
        <button onClick={() => inspect(1.27)}>Spread</button>
        <button onClick={() => inspect(1.43)}>Diffuse</button>
      </div>

      <details className="parameters">
        <summary>Parameters</summary>
        <div className="parameter-grid">
          {PARAMETERS.map(({ key, label, min, max }) => (
            <label key={key}>
              <span>{label}<output>{settings[key].toFixed(2)}</output></span>
              <input
                type="range"
                aria-label={label}
                min={min}
                max={max}
                step="0.01"
                value={settings[key]}
                onChange={(event) => setSettings((values) => ({ ...values, [key]: Number(event.target.value) }))}
              />
            </label>
          ))}
        </div>
        <button onClick={() => setSettings(DEFAULTS)}>Reset parameters</button>
      </details>

      <footer>
        <span>By <a href="https://github.com/mark-x64">Mark By</a></span>
        <nav aria-label="Project links">
          <a href={`${REPOSITORY}/blob/main/LICENSE`}>MIT code</a>
          <a href={`${REPOSITORY}/blob/main/THIRD_PARTY_NOTICES.md`}>Reference credit</a>
        </nav>
      </footer>
    </main>
  );
}
