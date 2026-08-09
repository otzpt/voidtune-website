import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import { Color, MathUtils } from 'three';
import type { ArchUnit, PipelineStage } from '../types';

/**
 * CPU pipeline as four stages with a packet animating through them, plus the
 * functional units arranged around the back-end.
 *
 * The moving packet is a single mesh whose position is derived from a clock,
 * not a per-frame React state update -- re-rendering React 60 times a second
 * to move one object is the classic R3F performance mistake.
 */

const STAGE_X = [-3.6, -1.2, 1.2, 3.6];
// Spacing is wider than the boxes so the DOM labels sit inside their own box
// rather than overlapping the neighbouring one.
const UNIT_POSITIONS: Record<string, [number, number, number]> = {
  control: [0, 1.9, 0],
  alu: [1.7, -1.6, 0],
  fpu: [3.4, -1.6, 0],
  l1: [-1.7, -1.6, 0],
  l2: [-3.4, -1.6, 0],
  l3: [-5.1, -1.6, 0],
  memctl: [5.1, -1.6, 0],
  registers: [0, -1.6, 0],
};

interface BoxProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label: string;
  sublabel?: string;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}

function LabeledBox({
  position,
  size,
  color,
  label,
  sublabel,
  active,
  selected,
  onSelect,
  reducedMotion,
}: BoxProps) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const base = useMemo(() => new Color(color), [color]);
  const hot = useMemo(() => new Color('#f0abfc'), []);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    const material = mesh.material;
    material.color.lerp(active || selected ? hot : base, smoothing);
    const wantedScale = active ? 1.12 : 1;
    mesh.scale.x = MathUtils.lerp(mesh.scale.x, wantedScale, smoothing);
    mesh.scale.y = MathUtils.lerp(mesh.scale.y, wantedScale, smoothing);
  });

  return (
    <group position={position}>
      <mesh
        ref={ref}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
        {selected && <Edges scale={1.04} color="#f5d0fe" />}
      </mesh>
      <Html position={[0, 0, size[2] / 2 + 0.02]} center distanceFactor={9} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`label3d strong ${active || selected ? 'on' : ''}`}>{label}</span>
        {sublabel && <span className="label3d sub">{sublabel}</span>}
      </Html>
    </group>
  );
}

/** The instruction travelling through the pipeline. */
function Packet({ paused, reducedMotion }: { paused: boolean; reducedMotion: boolean }) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!paused && !reducedMotion) elapsed.current += delta * 0.35;
    const t = elapsed.current % 1;
    // Move across the four stages, then wrap.
    const span = STAGE_X[3] - STAGE_X[0];
    mesh.position.x = STAGE_X[0] + t * span;
    mesh.position.y = 0.55 + Math.sin(t * Math.PI) * 0.12;
    const material = mesh.material;
    // Fade in and out at the ends so it doesn't visibly snap back to the start.
    material.transparent = true;
    material.opacity = Math.min(1, Math.sin(t * Math.PI) * 3);
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color="#f0abfc" emissive="#a855f7" emissiveIntensity={1.4} transparent />
    </mesh>
  );
}

interface ArchSceneProps {
  pipeline: PipelineStage[];
  units: ArchUnit[];
  selectedId: string | null;
  activeStage: string | null;
  paused: boolean;
  reducedMotion: boolean;
  onSelect: (id: string, kind: 'stage' | 'unit') => void;
}

export function ArchitectureScene({
  pipeline,
  units,
  selectedId,
  activeStage,
  paused,
  reducedMotion,
  onSelect,
}: ArchSceneProps) {
  return (
    <group>
      {pipeline.map((stage, index) => (
        <LabeledBox
          key={stage.id}
          position={[STAGE_X[index] ?? index * 2.4 - 3.6, 0, 0]}
          size={[1.9, 0.85, 0.3]}
          color={stage.unit === 'Front-end' ? '#3b2a6b' : '#2a3f6b'}
          label={stage.name.toUpperCase()}
          sublabel={stage.unit}
          active={activeStage === stage.id}
          selected={selectedId === stage.id}
          onSelect={() => onSelect(stage.id, 'stage')}
          reducedMotion={reducedMotion}
        />
      ))}

      <Packet paused={paused} reducedMotion={reducedMotion} />

      {units.map((unit) => (
        <LabeledBox
          key={unit.id}
          position={UNIT_POSITIONS[unit.id] ?? [0, -3, 0]}
          size={[1.55, 0.62, 0.25]}
          color="#232a3a"
          label={unit.name}
          active={false}
          selected={selectedId === unit.id}
          onSelect={() => onSelect(unit.id, 'unit')}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}
