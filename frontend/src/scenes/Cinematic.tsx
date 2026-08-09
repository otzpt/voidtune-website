import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { MathUtils, Vector3 } from 'three';
import { cameraAt, clamp01, range } from './timeline';

/**
 * The single scene the whole page scrolls through.
 *
 * Everything here is a pure function of scroll progress, read from a ref
 * inside useFrame. Nothing in this file calls setState, so scrolling never
 * re-renders React -- the meshes are mutated directly, which is the only way
 * this stays smooth on a long timeline.
 *
 * The PC, the CPU and the GPU all live in the scene at once and are faded in
 * and out by act. Mounting/unmounting them on scroll would rebuild geometry
 * mid-scroll and stutter exactly where the motion needs to be smooth.
 */

interface Props {
  progress: React.RefObject<number>;
  reducedMotion: boolean;
}

/** Sets a mesh's opacity, keeping `visible` in sync so fully faded objects
 * stop being drawn and stop taking raycasts. */
const setOpacity = (mesh: Mesh<never, MeshStandardMaterial> | null, value: number) => {
  if (!mesh) return;
  mesh.material.opacity = value;
  mesh.visible = value > 0.01;
};

export function Cinematic({ progress, reducedMotion }: Props) {
  const { camera } = useThree();

  // Groups: the whole machine, and each act's subject.
  const pcGroup = useRef<Group>(null);
  const cpuGroup = useRef<Group>(null);
  const gpuGroup = useRef<Group>(null);

  // PC parts that move independently.
  const panelL = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const panelR = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const shell = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const board = useRef<Group>(null);
  const cooler = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const cpuChip = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const desk = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const psu = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const gpuInCase = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const ram1 = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const ram2 = useRef<Mesh<never, MeshStandardMaterial>>(null);

  // CPU act: the three layers that separate edge-on.
  const substrate = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const ihs = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const die = useRef<Mesh<never, MeshStandardMaterial>>(null);

  // GPU act.
  const gpuShroud = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const gpuPcb = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const gpuDie = useRef<Mesh<never, MeshStandardMaterial>>(null);
  const gpuVram = useRef<Group>(null);

  const desired = useMemo(() => new Vector3(), []);
  const desiredLook = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const smoothed = useRef(0);

  useFrame((_, delta) => {
    const raw = progress.current ?? 0;
    // Ease the scroll value itself, so a flicked trackpad becomes a glide
    // rather than a jump. Frame-rate independent.
    const k = reducedMotion ? 1 : 1 - Math.pow(0.0001, delta);
    smoothed.current = MathUtils.lerp(smoothed.current, raw, k);
    const p = smoothed.current;

    // ---- camera -------------------------------------------------------
    const shot = cameraAt(p);
    desired.set(...shot.position);
    desiredLook.set(...shot.lookAt);
    camera.position.copy(desired);
    lookTarget.lerp(desiredLook, reducedMotion ? 1 : 0.2);
    camera.lookAt(lookTarget);

    // ---- act visibility ------------------------------------------------
    const pcFade = 1 - range(p, 0.40, 0.46);
    const cpuFade = range(p, 0.40, 0.46) * (1 - range(p, 0.80, 0.845));
    const gpuFade = range(p, 0.80, 0.845);
    if (pcGroup.current) {
      pcGroup.current.visible = pcFade > 0.01;
      pcGroup.current.scale.setScalar(0.85 + pcFade * 0.15);
    }
    if (cpuGroup.current) cpuGroup.current.visible = cpuFade > 0.01;
    if (gpuGroup.current) gpuGroup.current.visible = gpuFade > 0.01;

    // ---- act 1: the PC --------------------------------------------------
    // Lift off the desk.
    const lift = range(p, 0.055, 0.13);
    if (pcGroup.current) pcGroup.current.position.y = lift * 1.1;
    setOpacity(desk.current, (1 - range(p, 0.05, 0.11)) * 0.9);

    // Panels leave sideways.
    const panels = range(p, 0.12, 0.19);
    if (panelR.current) panelR.current.position.x = 1.72 + panels * 4.2;
    if (panelL.current) panelL.current.position.x = -1.72 - panels * 4.2;
    setOpacity(panelR.current, (1 - panels * 0.9) * 0.22);
    setOpacity(panelL.current, (1 - panels * 0.9) * 0.22);

    // Shell fades so the board can come forward.
    setOpacity(shell.current, (1 - range(p, 0.17, 0.26)) * 0.13);
    setOpacity(psu.current, 1 - range(p, 0.19, 0.26));
    setOpacity(gpuInCase.current, 1 - range(p, 0.19, 0.25));
    setOpacity(ram1.current, 1 - range(p, 0.21, 0.28));
    setOpacity(ram2.current, 1 - range(p, 0.21, 0.28));

    // Motherboard slides out of the case toward the viewer.
    const boardOut = range(p, 0.19, 0.28);
    if (board.current) {
      board.current.position.z = -0.75 + boardOut * 1.5;
      board.current.rotation.y = boardOut * -0.25;
    }

    // Cooler lifts off.
    const coolerOff = range(p, 0.28, 0.35);
    if (cooler.current) {
      cooler.current.position.z = 0.02 + coolerOff * 2.2;
      cooler.current.position.y = 1.15 + coolerOff * 0.8;
    }
    setOpacity(cooler.current, 1 - range(p, 0.31, 0.36));

    // CPU rises out of the socket.
    const cpuOut = range(p, 0.35, 0.42);
    if (cpuChip.current) {
      cpuChip.current.position.y = 1.15 + cpuOut * 0.5;
      cpuChip.current.position.z = -0.6 + cpuOut * 1.4;
      cpuChip.current.rotation.x = cpuOut * -0.5;
    }

    // ---- act 2: the CPU -------------------------------------------------
    // Edge-on split: | | . | |
    const split = range(p, 0.475, 0.575);
    if (substrate.current) substrate.current.position.y = -split * 0.62;
    if (ihs.current) ihs.current.position.y = split * 0.62;
    if (die.current) die.current.position.y = 0;

    // Reassemble before handing off to the GPU.
    const close = range(p, 0.765, 0.80);
    if (substrate.current) substrate.current.position.y = -split * 0.62 * (1 - close);
    if (ihs.current) ihs.current.position.y = split * 0.62 * (1 - close);

    // Whole CPU rises as it exits.
    if (cpuGroup.current) {
      cpuGroup.current.position.y = range(p, 0.80, 0.845) * 2.4;
      cpuGroup.current.rotation.y = clamp01((p - 0.42) / 0.3) * 0.6;
    }

    // ---- act 3: the GPU -------------------------------------------------
    const shroudOff = range(p, 0.855, 0.915);
    if (gpuShroud.current) {
      gpuShroud.current.position.y = shroudOff * 1.05;
      gpuShroud.current.rotation.x = shroudOff * 0.3;
    }
    setOpacity(gpuShroud.current, gpuFade * (1 - shroudOff * 0.85));
    setOpacity(gpuPcb.current, gpuFade);
    setOpacity(gpuDie.current, gpuFade);
    if (gpuVram.current) gpuVram.current.visible = gpuFade > 0.01 && shroudOff > 0.25;
    if (gpuGroup.current) gpuGroup.current.rotation.y = -0.5 + range(p, 0.845, 1) * 0.9;
  });

  return (
    <group>
      {/* ---------- act 1: the PC ---------- */}
      <group ref={pcGroup}>
        {/* desk */}
        <mesh ref={desk} position={[0, -2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[16, 9]} />
          <meshStandardMaterial color="#14161c" roughness={0.95} transparent opacity={0.9} />
        </mesh>

        {/* case shell */}
        <mesh ref={shell}>
          <boxGeometry args={[3.3, 4.4, 1.9]} />
          <meshStandardMaterial color="#2b303a" roughness={0.9} transparent opacity={0.13} depthWrite={false} />
          <Edges color="#3d4450" />
        </mesh>

        {/* glass panels */}
        <mesh ref={panelR} position={[1.72, 0, 0]}>
          <boxGeometry args={[0.05, 4.4, 1.9]} />
          <meshStandardMaterial color="#93a4c4" roughness={0.05} transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <mesh ref={panelL} position={[-1.72, 0, 0]}>
          <boxGeometry args={[0.05, 4.4, 1.9]} />
          <meshStandardMaterial color="#93a4c4" roughness={0.05} transparent opacity={0.22} depthWrite={false} />
        </mesh>

        <mesh ref={psu} position={[0, -1.75, -0.35]}>
          <boxGeometry args={[2.6, 0.85, 1.1]} />
          <meshStandardMaterial color="#3d4351" roughness={0.6} metalness={0.3} transparent opacity={1} />
        </mesh>
        <mesh ref={gpuInCase} position={[-0.15, -0.15, -0.42]}>
          <boxGeometry args={[2.1, 0.42, 0.55]} />
          <meshStandardMaterial color="#5a6478" roughness={0.55} metalness={0.35} transparent opacity={1} />
        </mesh>

        {/* motherboard and what sits on it */}
        <group ref={board} position={[-0.15, 0.35, -0.75]}>
          <mesh>
            <boxGeometry args={[2.5, 3.1, 0.08]} />
            <meshStandardMaterial color="#2f7d5a" roughness={0.65} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.8, 0.07]}>
            <boxGeometry args={[0.66, 0.66, 0.06]} />
            <meshStandardMaterial color="#8b98ad" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh ref={ram1} position={[0.9, 0.85, 0.06]}>
            <boxGeometry args={[0.13, 1.05, 0.07]} />
            <meshStandardMaterial color="#9f7aea" roughness={0.5} transparent opacity={1} />
          </mesh>
          <mesh ref={ram2} position={[1.12, 0.85, 0.06]}>
            <boxGeometry args={[0.13, 1.05, 0.07]} />
            <meshStandardMaterial color="#9f7aea" roughness={0.5} transparent opacity={1} />
          </mesh>
        </group>

        <mesh ref={cooler} position={[-0.15, 1.15, 0.02]}>
          <boxGeometry args={[0.95, 0.95, 0.62]} />
          <meshStandardMaterial color="#aab3c2" roughness={0.35} metalness={0.7} transparent opacity={1} />
        </mesh>

        <mesh ref={cpuChip} position={[-0.15, 1.15, -0.6]}>
          <boxGeometry args={[0.52, 0.52, 0.07]} />
          <meshStandardMaterial color="#dfe4ec" roughness={0.3} metalness={0.8} transparent opacity={1} />
        </mesh>
      </group>

      {/* ---------- act 2: the CPU, edge-on ---------- */}
      <group ref={cpuGroup} visible={false}>
        {/* Split reads as | | . | | from the side: substrate below, lid above,
            die the thin bright sliver between them. */}
        <mesh ref={substrate}>
          <boxGeometry args={[1.7, 0.11, 1.7]} />
          <meshStandardMaterial color="#1c5540" roughness={0.7} metalness={0.2} />
          <Edges color="#2f7d5a" />
        </mesh>
        <mesh ref={die}>
          <boxGeometry args={[1.05, 0.05, 1.05]} />
          <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.7} roughness={0.3} metalness={0.5} />
          <Edges color="#e9d5ff" />
        </mesh>
        <mesh ref={ihs}>
          <boxGeometry args={[1.5, 0.13, 1.5]} />
          <meshStandardMaterial color="#c2cad6" roughness={0.2} metalness={0.9} />
          <Edges color="#e2e8f0" />
        </mesh>
      </group>

      {/* ---------- act 3: the GPU ---------- */}
      <group ref={gpuGroup} visible={false} position={[0, 0, 0]}>
        <mesh ref={gpuShroud} position={[0, 0, 0.28]}>
          <boxGeometry args={[3.0, 1.15, 0.34]} />
          <meshStandardMaterial color="#2d3340" roughness={0.5} metalness={0.6} transparent opacity={1} />
          <Edges color="#4a5568" />
        </mesh>
        <mesh ref={gpuPcb}>
          <boxGeometry args={[2.9, 1.05, 0.08]} />
          <meshStandardMaterial color="#1f4d3a" roughness={0.7} metalness={0.2} transparent opacity={1} />
        </mesh>
        <mesh ref={gpuDie} position={[0, 0, 0.08]}>
          <boxGeometry args={[0.72, 0.72, 0.07]} />
          <meshStandardMaterial color="#a855f7" emissive="#7c3aed" emissiveIntensity={0.8} roughness={0.3} transparent opacity={1} />
          <Edges color="#e9d5ff" />
        </mesh>
        {/* VRAM packages around the die */}
        <group ref={gpuVram} visible={false}>
          {[-0.72, 0.72].map((x) =>
            [-0.34, 0.34].map((y) => (
              <mesh key={`${x}:${y}`} position={[x, y, 0.075]}>
                <boxGeometry args={[0.3, 0.24, 0.06]} />
                <meshStandardMaterial color="#4c1d95" roughness={0.5} metalness={0.4} />
              </mesh>
            )),
          )}
        </group>
      </group>
    </group>
  );
}
