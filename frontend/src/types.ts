// Mirrors backend/models.py. Changing a field here means changing it there.

export interface PCComponent {
  id: string;
  name: string;
  short: string;
  description: string;
  connects_to: string[];
  facts: string[];
}

export interface CpuLayer {
  id: string;
  name: string;
  description: string;
  scale: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  unit: string;
}

export interface ArchUnit {
  id: string;
  name: string;
  description: string;
}

export interface SoftwareLayer {
  id: string;
  name: string;
  layer: number;
  description: string;
  reaches: string;
}

export interface Architecture {
  cpu_layers: CpuLayer[];
  pipeline: PipelineStage[];
  units: ArchUnit[];
  software_stack: SoftwareLayer[];
}

export interface Tweak {
  id: string;
  category: string;
  name: string;
  description: string;
  tier: 'Safe' | 'Extreme' | 'Nuclear';
  needs_reboot: boolean;
}

export interface OptimizationGroup {
  category: string;
  component_id: string | null;
  count: number;
  tweaks: Tweak[];
}

export interface VoidtuneInfo {
  name: string;
  version: string;
  edition: string;
  platform: string;
  license: string;
  repo: string;
  summary: string;
  what_it_does: string[];
  what_it_does_not_do: string[];
  total_tweaks: number;
}

export interface SystemSnapshot {
  simulated: boolean;
  cpu_usage: number;
  cpu_frequency_ghz: number;
  cores: number[];
  ram_used_gb: number;
  ram_total_gb: number;
  gpu_usage: number;
  vram_used_gb: number;
  vram_total_gb: number;
  storage_read_mbs: number;
  storage_write_mbs: number;
  network_mbps: number;
}

export interface HostInfo {
  available: boolean;
  source: string;
  fields: Record<string, string>;
}

export interface CacheEntry {
  level: number;
  type: string;
  size_kb: number;
}

export interface LatencySample {
  working_set_kb: number;
  latency_ns: number;
}

export interface LatencyData {
  source: string;
  caches: CacheEntry[];
  latency: LatencySample[];
}

// --- 3D scene metadata -----------------------------------------------------

export type SceneId = 'pc' | 'cpu' | 'architecture' | 'software' | 'voidtune';

/** Where a part sits when assembled, and where it travels to when removed.
 * Kept separate from the React component so the layout is data, not JSX. */
export interface PartTransform {
  id: string;
  position: [number, number, number];
  /** Offset applied (added to position) when this part is removed. */
  removedOffset: [number, number, number];
  size: [number, number, number];
  color: string;
}

export interface DisassemblyStep {
  index: number;
  /** Parts hidden/moved out at this step. */
  parts: string[];
  title: string;
  explanation: string;
  /** Camera target for this step. */
  camera: [number, number, number];
  lookAt: [number, number, number];
}
