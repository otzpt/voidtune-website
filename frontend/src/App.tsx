import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Cinematic } from './scenes/Cinematic';
import { CHAPTERS } from './scenes/timeline';
import { useContent } from './hooks/useContent';
import { useScrollProgress } from './hooks/useScrollProgress';
import { useSystemFeed } from './hooks/useSystemFeed';
import { Dashboard, LatencyChart, TextFallback } from './ui/Panels';
import { TheVoid } from './ui/TheVoid';
import './App.css';

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

export default function App() {
  const { components, architecture, voidtune, optimizations, latency, loading, error } = useContent();
  const [webgl] = useState(hasWebGL);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  const bounds = useMemo(() => CHAPTERS.map(({ from, to }) => ({ from, to })), []);
  const { progress, chapterIndex } = useScrollProgress(bounds);
  const chapter = CHAPTERS[chapterIndex];
  const voidRef = useRef<HTMLDivElement>(null);

  // Only polled while the architecture chapter is on screen -- there is no
  // reason to keep requesting telemetry the viewer cannot see.
  const showActivity = chapter.id === 'cpu-arch';
  const snapshot = useSystemFeed(showActivity);

  // Counts come from the real catalog, so a callout can never claim a number
  // the catalog does not actually contain.
  const tweakCount = useCallback(
    (category?: string) =>
      category ? (optimizations.find((group) => group.category === category)?.count ?? 0) : 0,
    [optimizations],
  );

  const toVoid = useCallback(() => {
    voidRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  // A scrolling page already handles PageDown/Home/End natively; the only
  // shortcut worth adding is jumping straight to the downloads.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'End') toVoid();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toVoid]);

  if (loading) {
    return (
      <div className="boot">
        <span className="boot-mark">VOIDTUNE</span>
        <p>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="boot">
        <span className="boot-mark">VOIDTUNE</span>
        <p className="boot-error">Could not reach the API: {error}</p>
        <p className="panel-note">Start it with `uvicorn main:app --port 8000` in `backend/`.</p>
      </div>
    );
  }

  if (!webgl) {
    return (
      <>
        <TextFallback
          components={components}
          cpuLayers={architecture?.cpu_layers ?? []}
          pipeline={architecture?.pipeline ?? []}
          units={architecture?.units ?? []}
          software={architecture?.software_stack ?? []}
          voidtune={voidtune}
          groups={optimizations}
        />
        <TheVoid info={voidtune} />
      </>
    );
  }

  const isLast = chapter.id === 'void';

  return (
    <div className="cine">
      {/* Fixed canvas. The track below it is what actually scrolls. */}
      <div className="cine-stage">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ position: [0, 1.2, 9.5], fov: 42 }}
        >
          <color attach="background" args={['#08090c']} />
          <ambientLight intensity={1.1} />
          <hemisphereLight intensity={0.65} color="#cbd5e1" groundColor="#1e293b" />
          <directionalLight position={[7, 8, 9]} intensity={2.1} />
          <directionalLight position={[-8, 2, 4]} intensity={0.85} color="#c4b5fd" />
          <pointLight position={[0, 0, 4]} intensity={20} distance={16} color="#a78bfa" />
          <Suspense fallback={null}>
            <Cinematic progress={progress} reducedMotion={reducedMotion} />
          </Suspense>
        </Canvas>
      </div>

      {/* Fixed overlay. Re-renders only when the chapter changes, not on scroll. */}
      <div className="cine-ui">
        <header className="cine-nav">
          <span className="brand">VOIDTUNE</span>
          <div className="cine-nav-right">
            <button onClick={() => setReducedMotion((value) => !value)} className={reducedMotion ? 'on' : ''}>
              {reducedMotion ? 'Motion off' : 'Motion on'}
            </button>
            <button onClick={toVoid}>Download</button>
          </div>
        </header>

        <div className={`cine-copy ${isLast ? 'hide' : ''}`} key={chapter.id}>
          {chapter.kicker && <p className="cine-kicker">{chapter.kicker}</p>}
          {chapter.title && <h1 className="cine-title">{chapter.title}</h1>}
          {chapter.body && <p className="cine-body">{chapter.body}</p>}
          {chapter.tweakCategory && (
            <p className="cine-tweak">
              <b>{tweakCount(chapter.tweakCategory)}</b> VOIDTUNE tweaks reach{' '}
              {chapter.tweakCategory.toLowerCase()}
            </p>
          )}
          {chapter.id === 'cpu-latency' && latency && (
            <div className="cine-latency">
              <LatencyChart data={latency} />
            </div>
          )}
        </div>

        {chapter.id === 'hero' && (
          <div className="scroll-cue" aria-hidden="true">
            <span>scroll</span>
            <i />
          </div>
        )}

        {showActivity && (
          <div className="cine-activity">
            <Dashboard snapshot={snapshot} />
          </div>
        )}

        <div className={`cine-progress ${isLast ? 'hide' : ''}`} aria-hidden="true">
          <i style={{ width: `${((chapterIndex + 1) / CHAPTERS.length) * 100}%` }} />
        </div>
      </div>

      {/* The scroll track: its height is how long the cinematic lasts. */}
      <div className="cine-track" />

      <div className="enter-wrap">
        <button className="enter" onClick={toVoid}>
          ENTER THE VOID
        </button>
      </div>

      <div ref={voidRef}>
        <TheVoid info={voidtune} />
      </div>
    </div>
  );
}
