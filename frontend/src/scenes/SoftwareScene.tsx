import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import { Color, MathUtils } from 'three';
import type { SoftwareLayer } from '../types';

/**
 * The software stack as a vertical descent from VOIDTUNE down to hardware,
 * with a call travelling downward through the layers.
 *
 * The syscall boundary is drawn wider and in a different colour because it is
 * the one layer that is a privilege transition rather than a piece of
 * software -- flattening it into "just another box" is the part of this
 * diagram people get wrong.
 */

const LAYER_HEIGHT = 0.62;

interface LayerBoxProps {
  layer: SoftwareLayer;
  y: number;
  selected: boolean;
  active: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
}

function LayerBox({ layer, y, selected, active, onSelect, reducedMotion }: LayerBoxProps) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const isBoundary = layer.id === 'syscall';
  const color = isBoundary ? '#7c2d12' : layer.id === 'voidtune' ? '#5b21b6' : '#1f2633';
  const base = useMemo(() => new Color(color), [color]);
  const hot = useMemo(() => new Color(isBoundary ? '#fb923c' : '#a78bfa'), [isBoundary]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    const material = mesh.material;
    material.color.lerp(active || selected ? hot : base, smoothing);
    const scale = active ? 1.06 : 1;
    mesh.scale.x = MathUtils.lerp(mesh.scale.x, scale, smoothing);
  });

  const width = isBoundary ? 5.4 : 4.4;

  return (
    <group position={[0, y, 0]}>
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
        <boxGeometry args={[width, 0.42, 0.9]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.2} />
        {selected && <Edges scale={1.02} color="#c4b5fd" />}
      </mesh>
      <Html position={[0, 0, 0.48]} center distanceFactor={9} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <span className={`label3d strong ${selected ? 'on' : ''}`}>{layer.name}</span>
        {isBoundary && <span className="label3d ring">ring 3 → ring 0</span>}
      </Html>
    </group>
  );
}

function Call({ count, paused, reducedMotion }: { count: number; paused: boolean; reducedMotion: boolean }) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const elapsed = useRef(0);
  const top = 0;
  const bottom = -(count - 1) * LAYER_HEIGHT;

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    if (!paused && !reducedMotion) elapsed.current += delta * 0.28;
    const t = elapsed.current % 1;
    mesh.position.y = MathUtils.lerp(top, bottom, t);
    const material = mesh.material;
    material.transparent = true;
    material.opacity = Math.min(1, Math.sin(t * Math.PI) * 3);
  });

  return (
    <mesh ref={ref} position={[0, top, 0.7]}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshStandardMaterial color="#f0abfc" emissive="#a855f7" emissiveIntensity={1.5} transparent />
    </mesh>
  );
}

interface SoftwareSceneProps {
  layers: SoftwareLayer[];
  selectedId: string | null;
  paused: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

export function SoftwareScene({ layers, selectedId, paused, reducedMotion, onSelect }: SoftwareSceneProps) {
  return (
    <group position={[0, (layers.length - 1) * LAYER_HEIGHT * 0.5, 0]}>
      {layers.map((layer, index) => (
        <LayerBox
          key={layer.id}
          layer={layer}
          y={-index * LAYER_HEIGHT}
          selected={selectedId === layer.id}
          active={false}
          onSelect={() => onSelect(layer.id)}
          reducedMotion={reducedMotion}
        />
      ))}
      <Call count={layers.length} paused={paused} reducedMotion={reducedMotion} />
    </group>
  );
}
