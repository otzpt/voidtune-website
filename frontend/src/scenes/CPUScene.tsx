import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import type { Mesh, MeshStandardMaterial } from 'three';
import { Color, MathUtils } from 'three';
import type { CpuLayer } from '../types';

/**
 * The CPU as a stack of labelled layers that separates vertically as the user
 * scrubs through it.
 *
 * SIMPLIFICATION: this is an educational stack, not a floorplan of any real
 * processor. Layer order (package -> IHS -> die -> cores -> cache -> execution
 * units -> registers -> transistors) is conceptual: the last four are not
 * physically stacked above one another, they are progressively smaller
 * structures within the die. The UI labels this explicitly rather than letting
 * the geometry imply a physical claim it cannot support.
 */

const LAYER_STYLE: Record<string, { color: string; size: [number, number, number] }> = {
  package: { color: '#1c5540', size: [2.6, 0.14, 2.6] },
  ihs: { color: '#c2cad6', size: [2.2, 0.16, 2.2] },
  die: { color: '#2a3547', size: [1.5, 0.1, 1.5] },
  cores: { color: '#7c3aed', size: [1.35, 0.09, 1.35] },
  cache: { color: '#4c1d95', size: [1.2, 0.08, 1.2] },
  execution: { color: '#a855f7', size: [1.0, 0.07, 1.0] },
  registers: { color: '#c4b5fd', size: [0.78, 0.06, 0.78] },
  transistors: { color: '#e9d5ff', size: [0.55, 0.05, 0.55] },
};

interface LayerProps {
  layer: CpuLayer;
  index: number;
  spread: number;
  selected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

function Layer({ layer, index, spread, selected, dimmed, reducedMotion, onSelect }: LayerProps) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const style = LAYER_STYLE[layer.id] ?? { color: '#666', size: [1, 0.1, 1] as [number, number, number] };
  const base = useMemo(() => new Color(style.color), [style.color]);
  const highlight = useMemo(() => new Color('#f0abfc'), []);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.002, delta);
    // Layers fan out downward from the package as spread increases.
    const targetY = -index * spread;
    mesh.position.y = MathUtils.lerp(mesh.position.y, targetY, smoothing);
    const material = mesh.material;
    material.color.lerp(selected ? highlight : base, smoothing);
    material.opacity = MathUtils.lerp(material.opacity, dimmed ? 0.2 : 0.95, smoothing);
    material.transparent = true;
  });

  return (
    <group>
      <mesh
        ref={ref}
        position={[0, -index * spread, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(layer.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={style.size} />
        <meshStandardMaterial color={style.color} roughness={0.4} metalness={0.5} transparent opacity={0.95} />
        {selected && <Edges scale={1.03} color="#f5d0fe" />}
      </mesh>
      {spread > 0.25 && (
        <Html
          position={[style.size[0] / 2 + 0.25, -index * spread, 0]}
          distanceFactor={9}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none', transform: 'translateY(-50%)' }}
        >
          <span className={`label3d ${selected ? 'on' : ''}`}>{layer.name}</span>
        </Html>
      )}
    </group>
  );
}

interface CPUSceneProps {
  layers: CpuLayer[];
  spread: number;
  selectedId: string | null;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

export function CPUScene({ layers, spread, selectedId, reducedMotion, onSelect }: CPUSceneProps) {
  return (
    <group position={[-1.4, 0.5 + ((layers.length - 1) * spread) / 2, 0]}>
      {layers.map((layer, index) => (
        <Layer
          key={layer.id}
          layer={layer}
          index={index}
          spread={spread}
          selected={selectedId === layer.id}
          dimmed={selectedId !== null && selectedId !== layer.id}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
