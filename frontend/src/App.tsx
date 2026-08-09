import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { PCScene } from './scenes/PCScene';
import { CPUScene } from './scenes/CPUScene';
import { ArchitectureScene } from './scenes/ArchitectureScene';
import { SoftwareScene } from './scenes/SoftwareScene';
import { DISASSEMBLY } from './scenes/pcLayout';
import { useContent } from './hooks/useContent';
import { useSystemFeed } from './hooks/useSystemFeed';
import { Dashboard, InfoPanel, LatencyChart, TextFallback, TextPanel, VoidtunePanel } from './ui/Panels';
import type { SceneId } from './types';
import './App.css';

const SCENE_CAMERA: Record<SceneId, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  pc: { position: [7.6, 3.4, 8.2], lookAt: [0, 0.55, 0] },
  cpu: { position: [4.6, 1.6, 6.4], lookAt: [0, 0, 0] },
  // Diagrams, not objects: viewed near head-on so the left-to-right ordering
  // reads as an ordering instead of a perspective smear.
  architecture: { position: [0, 0.4, 12.5], lookAt: [0, -0.5, 0] },
  software: { position: [0, 0, 9.5], lookAt: [0, 0, 0] },
  voidtune: { position: [7.6, 3.0, 8.6], lookAt: [0, 0.3, 0] },
};

const SCENES: { id: SceneId; label: string; hint: string }[] = [
  { id: 'pc', label: 'The PC', hint: 'Explore and disassemble' },
  { id: 'cpu', label: 'Inside the CPU', hint: 'Package to transistors' },
  { id: 'architecture', label: 'Architecture', hint: 'Pipeline and units' },
  { id: 'software', label: 'Software → Hardware', hint: 'How code reaches silicon' },
  { id: 'voidtune', label: 'VOIDTUNE', hint: 'What it actually changes' },
];

/** Eases the camera toward a target position/lookAt set by the active step.
 * Lives inside the Canvas because it needs per-frame access to the camera. */
function CameraRig({
  target,
  lookAt,
  enabled,
  reducedMotion,
  controls,
}: {
  target: [number, number, number];
  lookAt: [number, number, number];
  enabled: boolean;
  reducedMotion: boolean;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const desired = useMemo(() => new Vector3(), []);
  const desiredLook = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    if (!enabled) return;
    desired.set(...target);
    desiredLook.set(...lookAt);
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.01, delta);
    camera.position.lerp(desired, smoothing);
    if (controls.current) {
      controls.current.target.lerp(desiredLook, smoothing);
      controls.current.update();
    }
  });
  return null;
}

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
  // Scene is readable from the URL (?scene=cpu) so a section can be linked
  // to directly, and kept in sync on change.
  const [scene, setSceneState] = useState<SceneId>(() => {
    const wanted = new URLSearchParams(window.location.search).get('scene');
    return SCENES.some((item) => item.id === wanted) ? (wanted as SceneId) : 'pc';
  });
  const setScene = useCallback((next: SceneId) => {
    setSceneState(next);
    const url = new URL(window.location.href);
    url.searchParams.set('scene', next);
    window.history.replaceState({}, '', url);
  }, []);
  const [step, setStep] = useState(0);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedArch, setSelectedArch] = useState<string | null>(null);
  const [selectedSoftware, setSelectedSoftware] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [spread, setSpread] = useState(0.42);
  const [autoRotate, setAutoRotate] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [webgl] = useState(hasWebGL);
  const controls = useRef<OrbitControlsImpl>(null);

  const snapshot = useSystemFeed(!loading && webgl);
  const currentStep = DISASSEMBLY[step];

  // Which component the VOIDTUNE category maps to, so selecting a category
  // isolates the affected part in the PC scene.
  const isolatedComponent = useMemo(() => {
    if (scene !== 'voidtune' || !selectedCategory) return null;
    return optimizations.find((group) => group.category === selectedCategory)?.component_id ?? null;
  }, [scene, selectedCategory, optimizations]);

  const componentById = useCallback(
    (id: string | null) => components.find((component) => component.id === id) ?? null,
    [components],
  );

  const handleSelectPart = useCallback((componentId: string, partId: string) => {
    setSelectedPart(partId);
    setSelectedComponent(componentId);
  }, []);

  const reset = useCallback(() => {
    setStep(0);
    setSelectedPart(null);
    setSelectedComponent(null);
    setSelectedLayer(null);
    setSelectedArch(null);
    setSelectedSoftware(null);
    setSelectedCategory(null);
    setSpread(0.5);
  }, []);

  // Keyboard control. Arrow keys drive the disassembly because that is the
  // one control that is a sequence; everything else is a direct toggle.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (scene === 'pc') {
        if (event.key === 'ArrowRight') setStep((s) => Math.min(DISASSEMBLY.length - 1, s + 1));
        if (event.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1));
      }
      if (event.key === 'Escape') {
        setSelectedPart(null);
        setSelectedComponent(null);
        setSelectedLayer(null);
        setSelectedArch(null);
        setSelectedSoftware(null);
      }
      if (event.key === 'r' || event.key === 'R') reset();
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((p) => !p);
      }
      const index = Number(event.key);
      if (index >= 1 && index <= SCENES.length) setScene(SCENES[index - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene, reset, setScene]);

  const archNode = useMemo(() => {
    if (!architecture || !selectedArch) return null;
    const stage = architecture.pipeline.find((item) => item.id === selectedArch);
    if (stage) return { title: stage.name, subtitle: stage.unit, body: stage.description };
    const unit = architecture.units.find((item) => item.id === selectedArch);
    if (unit) return { title: unit.name, body: unit.description };
    return null;
  }, [architecture, selectedArch]);

  const softwareNode = useMemo(() => {
    if (!architecture || !selectedSoftware) return null;
    const layer = architecture.software_stack.find((item) => item.id === selectedSoftware);
    return layer ? { title: layer.name, subtitle: layer.reaches, body: layer.description } : null;
  }, [architecture, selectedSoftware]);

  const cpuLayer = useMemo(() => {
    if (!architecture || !selectedLayer) return null;
    return architecture.cpu_layers.find((item) => item.id === selectedLayer) ?? null;
  }, [architecture, selectedLayer]);

  if (loading) {
    return (
      <div className="boot">
        <span className="boot-mark">VOIDTUNE</span>
        <p>Loading content…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="boot">
        <span className="boot-mark">VOIDTUNE</span>
        <p className="boot-error">Could not reach the API: {error}</p>
        <p className="panel-note">Start the backend with `uvicorn main:app --port 8000` in `backend/`.</p>
      </div>
    );
  }

  if (!webgl) {
    return (
      <TextFallback
        components={components}
        cpuLayers={architecture?.cpu_layers ?? []}
        pipeline={architecture?.pipeline ?? []}
        units={architecture?.units ?? []}
        software={architecture?.software_stack ?? []}
        voidtune={voidtune}
        groups={optimizations}
      />
    );
  }

  return (
    <div className="app">
      <nav className="nav" aria-label="Sections">
        <span className="brand">VOIDTUNE</span>
        {SCENES.map((item, index) => (
          <button
            key={item.id}
            className={scene === item.id ? 'on' : ''}
            onClick={() => setScene(item.id)}
            title={`${item.hint} (${index + 1})`}
          >
            {item.label}
          </button>
        ))}
        <div className="nav-right">
          <button
            className={reducedMotion ? 'on' : ''}
            onClick={() => setReducedMotion((value) => !value)}
            title="Reduce motion"
          >
            {reducedMotion ? 'Motion off' : 'Motion on'}
          </button>
          <button onClick={reset} title="Reset scene (R)">
            Reset
          </button>
        </div>
      </nav>

      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [7.6, 3.4, 8.2], fov: 42 }}
        onPointerMissed={() => {
          setSelectedPart(null);
          setSelectedComponent(null);
          setSelectedLayer(null);
          setSelectedArch(null);
          setSelectedSoftware(null);
        }}
      >
        <color attach="background" args={['#08090c']} />
        <Suspense fallback={null}>
        {/* Bright enough to read dark components against a near-black
            background -- the first render was technically correct and visually
            unusable. Key from the front-right, fill from the left so parts
            facing away from the key light still have shape. */}
        <ambientLight intensity={1.15} />
        <hemisphereLight intensity={0.7} color="#cbd5e1" groundColor="#1e293b" />
        <directionalLight position={[7, 8, 9]} intensity={2.2} />
        <directionalLight position={[-8, 2, 4]} intensity={0.9} color="#c4b5fd" />
        <pointLight position={[0, 0, 4]} intensity={22} distance={14} color="#a78bfa" />

        <CameraRig
          target={scene === 'pc' ? currentStep.camera : SCENE_CAMERA[scene].position}
          lookAt={scene === 'pc' ? currentStep.lookAt : SCENE_CAMERA[scene].lookAt}
          enabled={!autoRotate}
          reducedMotion={reducedMotion}
          controls={controls}
        />

        {scene === 'pc' && (
          <>
            <PCScene
              removedParts={currentStep.parts}
              selectedId={selectedPart}
              isolatedId={null}
              reducedMotion={reducedMotion}
              autoRotate={autoRotate}
              onSelect={handleSelectPart}
            />
          </>
        )}

        {scene === 'voidtune' && (
          <PCScene
            removedParts={[]}
            selectedId={null}
            isolatedId={isolatedComponent}
            reducedMotion={reducedMotion}
            autoRotate={autoRotate}
            onSelect={handleSelectPart}
          />
        )}

        {scene === 'cpu' && architecture && (
          <CPUScene
            layers={architecture.cpu_layers}
            spread={spread}
            selectedId={selectedLayer}
            reducedMotion={reducedMotion}
            onSelect={setSelectedLayer}
          />
        )}

        {scene === 'architecture' && architecture && (
          <ArchitectureScene
            pipeline={architecture.pipeline}
            units={architecture.units}
            selectedId={selectedArch}
            activeStage={null}
            paused={paused}
            reducedMotion={reducedMotion}
            onSelect={(id) => setSelectedArch(id)}
          />
        )}

        {scene === 'software' && architecture && (
          <SoftwareScene
            layers={architecture.software_stack}
            selectedId={selectedSoftware}
            paused={paused}
            reducedMotion={reducedMotion}
            onSelect={setSelectedSoftware}
          />
        )}

        </Suspense>

        <OrbitControls
          ref={controls}
          enableDamping
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={22}
          makeDefault
        />
      </Canvas>

      {/* ---- overlays ---- */}
      {scene === 'pc' && (
        <>
          <Dashboard snapshot={snapshot} />
          <div className="stepper">
            <div className="stepper-head">
              <b>{currentStep.title}</b>
              <span>
                {step + 1} / {DISASSEMBLY.length}
              </span>
            </div>
            <p>{currentStep.explanation}</p>
            <div className="progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={DISASSEMBLY.length}>
              <i style={{ width: `${((step + 1) / DISASSEMBLY.length) * 100}%` }} />
            </div>
            <div className="stepper-controls">
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                ← Previous
              </button>
              <button
                onClick={() => setStep((s) => Math.min(DISASSEMBLY.length - 1, s + 1))}
                disabled={step === DISASSEMBLY.length - 1}
              >
                Next →
              </button>
              <button onClick={() => setAutoRotate((value) => !value)} className={autoRotate ? 'on' : ''}>
                {autoRotate ? 'Stop spin' : 'Spin'}
              </button>
              {step === DISASSEMBLY.length - 1 && (
                <button className="primary" onClick={() => setScene('cpu')}>
                  Enter the CPU →
                </button>
              )}
            </div>
          </div>
          <InfoPanel
            component={componentById(selectedComponent)}
            onClose={() => {
              setSelectedPart(null);
              setSelectedComponent(null);
            }}
          />
        </>
      )}

      {scene === 'cpu' && (
        <>
          <div className="stepper">
            <div className="stepper-head">
              <b>Inside the CPU</b>
              <span>{architecture?.cpu_layers.length ?? 0} layers</span>
            </div>
            <p className="panel-note">
              SIMPLIFIED: a conceptual stack, not the floorplan of a real processor. The lower layers
              are progressively smaller structures inside the die, not slices sitting under it.
            </p>
            <label className="slider">
              Separation
              <input
                type="range"
                min={0}
                max={0.85}
                step={0.01}
                value={spread}
                onChange={(event) => setSpread(Number(event.target.value))}
              />
            </label>
            <div className="stepper-controls">
              <button onClick={() => setSpread(0)}>Collapse</button>
              <button onClick={() => setSpread(0.75)}>Explode</button>
              <button className="primary" onClick={() => setScene('architecture')}>
                Architecture →
              </button>
            </div>
          </div>
          {cpuLayer && (
            <TextPanel
              title={cpuLayer.name}
              subtitle={cpuLayer.scale}
              body={cpuLayer.description}
              onClose={() => setSelectedLayer(null)}
            />
          )}
          {!cpuLayer && latency && (
            <aside className="panel panel-right">
              <LatencyChart data={latency} />
            </aside>
          )}
        </>
      )}

      {scene === 'architecture' && (
        <>
          <div className="stepper">
            <div className="stepper-head">
              <b>Instruction pipeline</b>
              <span>fetch → decode → execute → writeback</span>
            </div>
            <p>
              The moving point is one instruction travelling through the pipeline. Click any stage or
              unit for what it does.
            </p>
            <div className="stepper-controls">
              <button onClick={() => setPaused((value) => !value)}>{paused ? 'Play' : 'Pause'}</button>
              <button className="primary" onClick={() => setScene('software')}>
                Software → Hardware
              </button>
            </div>
          </div>
          {archNode && (
            <TextPanel
              title={archNode.title}
              subtitle={archNode.subtitle}
              body={archNode.body}
              onClose={() => setSelectedArch(null)}
            />
          )}
        </>
      )}

      {scene === 'software' && (
        <>
          <div className="stepper">
            <div className="stepper-head">
              <b>Software reaching hardware</b>
              <span>7 layers</span>
            </div>
            <p>
              Every layer down is a real boundary. The orange one is the only privilege transition:
              user mode cannot cross it except through a syscall.
            </p>
            <div className="stepper-controls">
              <button onClick={() => setPaused((value) => !value)}>{paused ? 'Play' : 'Pause'}</button>
              <button className="primary" onClick={() => setScene('voidtune')}>
                Where VOIDTUNE fits →
              </button>
            </div>
          </div>
          {softwareNode && (
            <TextPanel
              title={softwareNode.title}
              subtitle={softwareNode.subtitle}
              body={softwareNode.body}
              onClose={() => setSelectedSoftware(null)}
            />
          )}
        </>
      )}

      {scene === 'voidtune' && (
        <VoidtunePanel
          info={voidtune}
          groups={optimizations}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      )}

      <footer className="hints">
        drag rotate · scroll zoom · right-drag pan · click a part · ←/→ steps · R reset · space pause
      </footer>
    </div>
  );
}
