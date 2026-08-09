import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Color, MathUtils, Vector3 } from 'three';
import { PARTS, componentIdFor } from './pcLayout';
import type { PartTransform } from '../types';

interface PartProps {
  part: PartTransform;
  removed: boolean;
  selected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

const HIGHLIGHT = new Color('#a78bfa');

/**
 * One PC part. Position is animated toward its target every frame rather than
 * set directly, which is what makes removal read as the part being pulled out
 * instead of teleporting. Colour is lerped the same way so highlight/dim
 * transitions are smooth.
 */
function Part({ part, removed, selected, dimmed, reducedMotion, onSelect }: PartProps) {
  const ref = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const [hovered, setHovered] = useState(false);
  const base = useMemo(() => new Color(part.color), [part.color]);
  const target = useMemo(() => new Vector3(), []);
  const isGlass = part.id === 'side_panel';

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const [x, y, z] = part.position;
    const [ox, oy, oz] = part.removedOffset;
    target.set(removed ? x + ox : x, removed ? y + oy : y, removed ? z + oz : z);

    // Frame-rate independent smoothing: a fixed lerp factor would move faster
    // on a 144Hz display than a 60Hz one.
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0015, delta);
    mesh.position.lerp(target, smoothing);

    const material = mesh.material;
    const wanted = selected || hovered ? HIGHLIGHT : base;
    material.color.lerp(wanted, smoothing);
    // The glass panel stays see-through even when present, otherwise it hides
    // the interior; every other part is opaque unless removed or dimmed.
    const solidOpacity = isGlass ? 0.16 : 1;
    const wantedOpacity = removed ? 0 : dimmed ? 0.12 : solidOpacity;
    // Only opacity is animated. Flipping material.transparent at runtime
    // needs material.needsUpdate to recompile the shader, and toggling it per
    // frame is churn either way -- the material is declared transparent up
    // front instead, so changing opacity alone is enough.
    material.opacity = MathUtils.lerp(material.opacity, wantedOpacity, smoothing);
  });

  return (
    <mesh
      ref={ref}
      position={part.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(part.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={part.size} />
      <meshStandardMaterial
        color={part.color}
        roughness={isGlass ? 0.05 : 0.55}
        metalness={isGlass ? 0.1 : 0.35}
        transparent
        // Set here rather than only in useFrame: the frame loop lerps toward
        // this, but the first painted frame must already be correct or the
        // glass panel flashes opaque and hides the interior.
        opacity={isGlass ? 0.16 : 1}
        depthWrite={!isGlass}
      />
      {(selected || hovered) && <Edges scale={1.02} color="#c4b5fd" />}
    </mesh>
  );
}

interface PCSceneProps {
  removedParts: string[];
  selectedId: string | null;
  isolatedId: string | null;
  reducedMotion: boolean;
  autoRotate: boolean;
  onSelect: (componentId: string, partId: string) => void;
}

export function PCScene({
  removedParts,
  selectedId,
  isolatedId,
  reducedMotion,
  autoRotate,
  onSelect,
}: PCSceneProps) {
  const group = useRef<Group>(null);
  const removed = useMemo(() => new Set(removedParts), [removedParts]);

  useFrame((_, delta) => {
    if (group.current && autoRotate && !reducedMotion) {
      group.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={group}>
      {PARTS.map((part) => {
        // The case shell is drawn as a wireframe-ish open box so the interior
        // stays visible; a solid case would hide everything this scene exists
        // to show.
        if (part.id === 'case') {
          return (
            <mesh key={part.id} position={part.position}>
              <boxGeometry args={part.size} />
              <meshStandardMaterial
                color={part.color}
                roughness={0.9}
                metalness={0.2}
                transparent
                opacity={0.12}
                depthWrite={false}
              />
              <Edges scale={1} color="#3d4450" />
            </mesh>
          );
        }
        return (
          <Part
            key={part.id}
            part={part}
            removed={removed.has(part.id)}
            selected={selectedId === part.id}
            dimmed={isolatedId !== null && componentIdFor(part.id) !== isolatedId}
            reducedMotion={reducedMotion}
            onSelect={(id) => onSelect(componentIdFor(id), id)}
          />
        );
      })}
    </group>
  );
}
