import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

// A rotating box as a placeholder -- swap the geometry/material for the real
// scene. Keep in mind what actually costs FPS as this grows:
//   - fewer draw calls beats fewer polygons: reuse geometries/materials, use
//     <instancedMesh> for repeated objects instead of mapping many <mesh>es.
//   - compress imported models (glTF + Draco) and load them lazily.
//   - if the scene isn't constantly animating, set frameloop="demand" on
//     <Canvas> (in App.tsx) and call invalidate() on interaction instead of
//     rendering every frame.
function RotatingBox() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.5;
    ref.current.rotation.y += delta * 0.5;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#7c3aed" />
    </mesh>
  );
}

export function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 3, 3]} intensity={1} />
      <RotatingBox />
    </>
  );
}
