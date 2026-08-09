import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';

/**
 * Detailed procedural PC parts.
 *
 * Procedural rather than downloaded models, for three reasons that all still
 * hold now that detail matters: every part has to come apart independently
 * (a downloaded case is usually one welded mesh), the whole scene stays a few
 * KB of code instead of megabytes of GLTF over the wire, and there is no
 * licence to track.
 *
 * Detail without cost: anything repeated -- heatsink fins, capacitors, fan
 * blades, VRM chokes -- is drawn with instancing, so 40 fins are one draw call
 * rather than 40. Cylinders use low segment counts (8-12); at these screen
 * sizes nothing reads as faceted, and it keeps triangle counts in the low
 * thousands for the whole machine.
 */

const METAL = { roughness: 0.32, metalness: 0.85 };
const PLASTIC = { roughness: 0.62, metalness: 0.1 };
const PCB = { roughness: 0.68, metalness: 0.15 };

/** A stack of thin aluminium fins. One draw call regardless of count. */
export function FinStack({
  count = 34,
  width = 1.1,
  height = 0.95,
  depth = 0.02,
  spacing = 0.028,
  color = '#c3cad6',
}: {
  count?: number;
  width?: number;
  height?: number;
  depth?: number;
  spacing?: number;
  color?: string;
}) {
  const offsets = useMemo(
    () => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * spacing),
    [count, spacing],
  );
  return (
    <Instances limit={count} range={count}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} {...METAL} />
      {offsets.map((z, i) => (
        <Instance key={i} position={[0, 0, z]} />
      ))}
    </Instances>
  );
}

/** Copper heatpipes running up through a cooler. */
export function Heatpipes({
  count = 4,
  spread = 0.62,
  height = 1.0,
  radius = 0.035,
}: {
  count?: number;
  spread?: number;
  height?: number;
  radius?: number;
}) {
  const xs = useMemo(
    () => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * (spread / Math.max(1, count - 1))),
    [count, spread],
  );
  return (
    <Instances limit={count} range={count}>
      <cylinderGeometry args={[radius, radius, height, 10]} />
      <meshStandardMaterial color="#b87333" roughness={0.25} metalness={0.95} />
      {xs.map((x, i) => (
        <Instance key={i} position={[x, 0, 0]} />
      ))}
    </Instances>
  );
}

/** Axial fan: hub plus angled blades in a square frame. */
export function Fan({
  size = 1.0,
  blades = 9,
  color = '#22262e',
  bladeColor = '#3a4150',
}: {
  size?: number;
  blades?: number;
  color?: string;
  bladeColor?: string;
}) {
  const angles = useMemo(
    () => Array.from({ length: blades }, (_, i) => (i / blades) * Math.PI * 2),
    [blades],
  );
  const r = size * 0.5;
  return (
    <group>
      {/* frame */}
      <mesh>
        <boxGeometry args={[size, size, 0.16]} />
        <meshStandardMaterial color={color} {...PLASTIC} />
      </mesh>
      {/* bore */}
      <mesh>
        <cylinderGeometry args={[r * 0.92, r * 0.92, 0.19, 24]} />
        <meshStandardMaterial color="#0d1016" roughness={0.9} />
      </mesh>
      {/* blades */}
      <Instances limit={blades} range={blades}>
        <boxGeometry args={[r * 0.78, 0.02, 0.2]} />
        <meshStandardMaterial color={bladeColor} {...PLASTIC} />
        {angles.map((a, i) => (
          <Instance
            key={i}
            position={[Math.cos(a) * r * 0.46, Math.sin(a) * r * 0.46, 0]}
            rotation={[0, 0, a + 0.45]}
          />
        ))}
      </Instances>
      {/* hub */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.3, r * 0.3, 0.14, 18]} />
        <meshStandardMaterial color="#15181f" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/** Rows of surface-mount capacitors / chokes on a board. */
export function Chips({
  positions,
  size = [0.09, 0.09, 0.07] as [number, number, number],
  color = '#1b2029',
}: {
  positions: [number, number, number][];
  size?: [number, number, number];
  color?: string;
}) {
  return (
    <Instances limit={positions.length} range={positions.length}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.5} />
      {positions.map((p, i) => (
        <Instance key={i} position={p} />
      ))}
    </Instances>
  );
}

/** A slot connector (DIMM / PCIe): a coloured trough with a lip at each end. */
export function Slot({
  length = 1.0,
  color = '#1a1d24',
  height = 0.055,
}: {
  length?: number;
  color?: string;
  height?: number;
}) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[length, height, 0.07]} />
        <meshStandardMaterial color={color} {...PLASTIC} />
      </mesh>
      <mesh position={[length / 2 - 0.02, height * 0.9, 0]}>
        <boxGeometry args={[0.05, height * 1.4, 0.08]} />
        <meshStandardMaterial color="#2b313c" {...PLASTIC} />
      </mesh>
      <mesh position={[-length / 2 + 0.02, height * 0.9, 0]}>
        <boxGeometry args={[0.05, height * 1.4, 0.08]} />
        <meshStandardMaterial color="#2b313c" {...PLASTIC} />
      </mesh>
    </group>
  );
}

/** The motherboard: PCB, socket assembly, VRM, chipset, slots, connectors. */
export function Motherboard() {
  const vrmChokes = useMemo<[number, number, number][]>(
    () => Array.from({ length: 8 }, (_, i) => [-0.62 + (i % 4) * 0.16, 1.24 - Math.floor(i / 4) * 0.16, 0.06]),
    [],
  );
  const caps = useMemo<[number, number, number][]>(
    () => [
      [0.66, 0.42, 0.06], [0.78, 0.42, 0.06], [0.9, 0.42, 0.06],
      [-0.9, -0.2, 0.06], [-0.78, -0.2, 0.06],
      [0.2, -1.15, 0.06], [0.34, -1.15, 0.06], [0.48, -1.15, 0.06],
    ],
    [],
  );

  return (
    <group>
      {/* PCB */}
      <mesh>
        <boxGeometry args={[2.5, 3.1, 0.07]} />
        <meshStandardMaterial color="#14432f" {...PCB} />
      </mesh>
      {/* silkscreen-ish lighter band */}
      <mesh position={[0, -1.42, 0.037]}>
        <boxGeometry args={[2.5, 0.14, 0.004]} />
        <meshStandardMaterial color="#1d5c41" {...PCB} />
      </mesh>

      {/* CPU socket: retention frame around a recessed contact area */}
      <group position={[-0.12, 0.86, 0.04]}>
        <mesh>
          <boxGeometry args={[0.78, 0.78, 0.03]} />
          <meshStandardMaterial color="#0f1319" roughness={0.8} />
        </mesh>
        {[[0, 0.4], [0, -0.4], [0.4, 0], [-0.4, 0]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.03]}>
            <boxGeometry args={x === 0 ? [0.86, 0.07, 0.06] : [0.07, 0.86, 0.06]} />
            <meshStandardMaterial color="#8b98ad" {...METAL} />
          </mesh>
        ))}
        {/* retention lever */}
        <mesh position={[0.48, -0.1, 0.04]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.05, 0.5, 0.04]} />
          <meshStandardMaterial color="#9aa6b8" {...METAL} />
        </mesh>
      </group>

      {/* VRM heatsinks, left and top of socket */}
      <group position={[-1.0, 0.9, 0.09]}>
        <FinStack count={12} width={0.34} height={0.5} spacing={0.03} color="#4a525f" />
      </group>
      <group position={[-0.12, 1.42, 0.09]} rotation={[0, 0, Math.PI / 2]}>
        <FinStack count={10} width={0.3} height={0.9} spacing={0.032} color="#4a525f" />
      </group>
      <Chips positions={vrmChokes} size={[0.11, 0.11, 0.09]} color="#242a34" />

      {/* chipset heatsink */}
      <mesh position={[0.15, -0.75, 0.09]}>
        <boxGeometry args={[0.55, 0.55, 0.1]} />
        <meshStandardMaterial color="#2f3742" roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0.15, -0.75, 0.15]}>
        <boxGeometry args={[0.4, 0.4, 0.012]} />
        <meshStandardMaterial color="#7c3aed" emissive="#5b21b6" emissiveIntensity={0.5} roughness={0.3} />
      </mesh>

      {/* DIMM slots */}
      {[0.62, 0.78, 0.94, 1.1].map((x, i) => (
        <group key={i} position={[x, 0.86, 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <Slot length={1.05} color={i % 2 === 0 ? '#1a1d24' : '#2a1d3a'} />
        </group>
      ))}

      {/* PCIe slots */}
      <group position={[-0.05, -0.25, 0.06]}>
        <Slot length={1.5} color="#241a30" height={0.07} />
      </group>
      <group position={[-0.35, -0.62, 0.06]}>
        <Slot length={0.5} color="#1a1d24" />
      </group>

      {/* M.2 with its own heatsink */}
      <mesh position={[-0.05, -1.02, 0.07]}>
        <boxGeometry args={[1.1, 0.16, 0.05]} />
        <meshStandardMaterial color="#3a4250" roughness={0.35} metalness={0.7} />
      </mesh>

      {/* 24-pin ATX + EPS connectors */}
      <mesh position={[1.16, 0.05, 0.08]}>
        <boxGeometry args={[0.14, 0.62, 0.12]} />
        <meshStandardMaterial color="#e8eaee" {...PLASTIC} />
      </mesh>
      <mesh position={[-0.12, 1.5, 0.08]}>
        <boxGeometry args={[0.36, 0.12, 0.11]} />
        <meshStandardMaterial color="#1c2029" {...PLASTIC} />
      </mesh>

      {/* rear I/O shroud */}
      <mesh position={[-1.0, 1.28, 0.12]}>
        <boxGeometry args={[0.46, 0.5, 0.16]} />
        <meshStandardMaterial color="#191d25" roughness={0.5} metalness={0.4} />
      </mesh>

      <Chips positions={caps} />
    </group>
  );
}

/** Tower cooler: baseplate, heatpipes, fin stack, fan. */
export function TowerCooler() {
  return (
    <group>
      <mesh position={[0, -0.52, 0]}>
        <boxGeometry args={[0.56, 0.1, 0.56]} />
        <meshStandardMaterial color="#c9d0da" roughness={0.18} metalness={0.95} />
      </mesh>
      <group position={[0, 0.05, 0]}>
        <Heatpipes count={4} spread={0.42} height={1.1} />
      </group>
      <group position={[0, 0.2, 0]}>
        <FinStack count={38} width={0.92} height={0.86} spacing={0.026} />
      </group>
      {/* top plate */}
      <mesh position={[0, 0.66, 0]}>
        <boxGeometry args={[0.96, 0.04, 0.52]} />
        <meshStandardMaterial color="#aeb6c2" {...METAL} />
      </mesh>
      {/* fan on the intake face */}
      <group position={[0, 0.2, 0.36]}>
        <Fan size={0.92} />
      </group>
    </group>
  );
}

/** DIMM with a finned heat spreader. */
export function RamStick({ color = '#6d28d9' }: { color?: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.1, 0.92, 0.05]} />
        <meshStandardMaterial color="#0f3826" {...PCB} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.12, 0.8, 0.075]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.75} />
      </mesh>
      {/* diffuser strip along the top */}
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[0.1, 0.06, 0.055]} />
        <meshStandardMaterial color="#e9d5ff" emissive="#a855f7" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

/** Graphics card: backplate, PCB, shroud with two fans, bracket. */
export function GraphicsCard({ shroudRef }: { shroudRef?: React.Ref<never> }) {
  void shroudRef;
  return (
    <group>
      {/* PCB */}
      <mesh>
        <boxGeometry args={[2.4, 0.86, 0.05]} />
        <meshStandardMaterial color="#12291f" {...PCB} />
      </mesh>
      {/* fin stack under the shroud */}
      <group position={[0.15, 0, -0.02]} rotation={[0, Math.PI / 2, 0]}>
        <FinStack count={30} width={0.5} height={0.7} spacing={0.06} color="#9aa3b0" />
      </group>
      {/* backplate */}
      <mesh position={[0, 0, -0.09]}>
        <boxGeometry args={[2.36, 0.82, 0.03]} />
        <meshStandardMaterial color="#20242c" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* PCIe bracket */}
      <mesh position={[-1.24, -0.05, 0.05]}>
        <boxGeometry args={[0.05, 0.98, 0.34]} />
        <meshStandardMaterial color="#c8ccd4" {...METAL} />
      </mesh>
      {/* power connectors */}
      <mesh position={[0.9, 0.46, 0.06]}>
        <boxGeometry args={[0.36, 0.1, 0.12]} />
        <meshStandardMaterial color="#15181f" {...PLASTIC} />
      </mesh>
    </group>
  );
}

/** The shroud that lifts off the card, with its fans. */
export function GpuShroud() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2.44, 0.9, 0.3]} />
        <meshStandardMaterial color="#252a33" roughness={0.5} metalness={0.55} />
      </mesh>
      <group position={[-0.56, 0, 0.16]}>
        <Fan size={0.74} blades={11} color="#1b1f27" bladeColor="#333a47" />
      </group>
      <group position={[0.56, 0, 0.16]}>
        <Fan size={0.74} blades={11} color="#1b1f27" bladeColor="#333a47" />
      </group>
      {/* lit accent strip */}
      <mesh position={[0, 0.43, 0.12]}>
        <boxGeometry args={[1.9, 0.035, 0.06]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#7c3aed" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/** Power supply with a grille and its cable bundle stub. */
export function PowerSupply() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[2.5, 0.82, 1.05]} />
        <meshStandardMaterial color="#1a1e26" roughness={0.55} metalness={0.45} />
      </mesh>
      <group position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan size={0.66} blades={7} />
      </group>
      <mesh position={[1.27, 0, 0]}>
        <boxGeometry args={[0.04, 0.62, 0.8]} />
        <meshStandardMaterial color="#0e1117" roughness={0.8} />
      </mesh>
    </group>
  );
}
