/**
 * The whole cinematic as data.
 *
 * Scroll position maps to a single normalised `progress` value in [0,1], and
 * everything on screen is a pure function of it. Keeping the timeline as data
 * rather than as effects scattered through components means the pacing can be
 * retuned by editing numbers here, and the same values drive the text overlay,
 * the camera, and the part transforms so they cannot drift out of sync.
 *
 * Each chapter owns a scroll range. Within a chapter, `local` is 0..1.
 */

export interface Chapter {
  id: string;
  /** Scroll range this chapter occupies, in normalised page progress. */
  from: number;
  to: number;
  /** Overlay copy. `kicker` is the small label, `title` the headline. */
  kicker?: string;
  title?: string;
  body?: string;
  /** Optional callout tied to real VOIDTUNE catalog categories. */
  tweakCategory?: string;
}

/**
 * Chapters are contiguous and cover 0..1. Ranges are deliberately uneven: the
 * teardown beats need room to read, the transitions between acts do not.
 */
export const CHAPTERS: Chapter[] = [
  {
    id: 'hero',
    from: 0,
    to: 0.06,
    kicker: 'VOIDTUNE',
    title: 'Your PC is a stack of decisions.',
    body: 'Most of them were made by someone else. Scroll to take it apart.',
  },
  {
    id: 'lift',
    from: 0.06,
    to: 0.12,
    kicker: 'The machine',
    title: 'One case. Twelve parts that matter.',
    body: 'It leaves the desk so you can see all of it at once.',
  },
  {
    id: 'panels',
    from: 0.12,
    to: 0.19,
    kicker: 'Step 1',
    title: 'The panels come off.',
    body: 'Nothing is mounted to them. They are structure and airflow, and they are in the way.',
  },
  {
    id: 'board',
    from: 0.19,
    to: 0.28,
    kicker: 'Step 2',
    title: 'The motherboard comes out.',
    body: 'Every component talks through this board. The chipset splits it into lanes: the CPU gets direct PCIe to the GPU and the primary M.2, everything slower shares an uplink.',
  },
  {
    id: 'cooler',
    from: 0.28,
    to: 0.35,
    kicker: 'Step 3',
    title: 'The cooler unbolts.',
    body: 'Thermal paste is a gap filler, not a conductor upgrade. When cooling runs out the CPU throttles itself — which is why "max performance" settings can cost you frames on a thermally limited machine.',
    tweakCategory: 'Power',
  },
  {
    id: 'cpu-out',
    from: 0.35,
    to: 0.42,
    kicker: 'Step 4',
    title: 'The CPU lifts out.',
    body: 'The retention arm opens and it comes free with no force. On an LGA socket the pins live in the socket — bending them is a board repair, not a CPU one.',
  },
  {
    id: 'cpu-profile',
    from: 0.42,
    to: 0.48,
    kicker: 'Inside',
    title: 'Edge on.',
    body: 'From the side it is a sandwich: substrate, lid, and a sliver of silicon that does all the work.',
  },
  {
    id: 'cpu-split',
    from: 0.48,
    to: 0.58,
    kicker: 'Inside',
    title: 'It comes apart in layers.',
    body: 'Package, heat spreader, die. Everything above the die exists to power it, cool it, and connect it.',
  },
  {
    id: 'cpu-arch',
    from: 0.58,
    to: 0.70,
    kicker: 'Architecture',
    title: 'Fetch. Decode. Execute. Writeback.',
    body: 'The scheduler decides which core runs your game thread, and how aggressively the core is allowed to clock. That decision is exactly what a handful of VOIDTUNE tweaks reach.',
    tweakCategory: 'CPU',
  },
  {
    id: 'cpu-latency',
    from: 0.70,
    to: 0.76,
    kicker: 'Measured',
    title: 'Cache is not a metaphor.',
    body: 'These numbers were measured on a real machine by the C helper in this repo — a shuffled pointer chase, so each load waits on the last. The steps are the cache levels.',
  },
  {
    id: 'cpu-back',
    from: 0.76,
    to: 0.80,
    kicker: 'Back together',
    title: 'And it closes again.',
    body: 'Every tweak VOIDTUNE applies is reversible. Same idea.',
  },
  {
    id: 'gpu-swap',
    from: 0.80,
    to: 0.85,
    kicker: 'The other one',
    title: 'Now the card.',
    body: 'The part that actually draws the frames.',
  },
  {
    id: 'gpu-open',
    from: 0.85,
    to: 0.94,
    kicker: 'Inside the GPU',
    title: 'Shroud off, die exposed.',
    body: 'Thousands of small cores and their own high-bandwidth memory. The CPU prepares the work; this executes it. Starve it of either and the frames go away.',
    tweakCategory: 'GPU',
  },
  {
    id: 'void',
    from: 0.94,
    to: 1,
    kicker: 'That is the machine',
    title: 'Now take it back.',
    body: '',
  },
];

export const chapterAt = (progress: number): Chapter =>
  CHAPTERS.find((chapter) => progress >= chapter.from && progress < chapter.to) ??
  CHAPTERS[CHAPTERS.length - 1];

/** 0..1 position inside a chapter. */
export const localProgress = (chapter: Chapter, progress: number) =>
  clamp01((progress - chapter.from) / (chapter.to - chapter.from));

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Smoothstep: eases both ends so motion never starts or stops abruptly. */
export const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Maps `progress` from range [a,b] onto 0..1, eased. Values outside clamp. */
export const range = (progress: number, a: number, b: number) => ease((progress - a) / (b - a));

/** Linear interpolation between two 3-vectors, as plain tuples. */
export type Vec3 = [number, number, number];

export const lerpVec = (from: Vec3, to: Vec3, t: number): Vec3 => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
  from[2] + (to[2] - from[2]) * t,
];

/**
 * Camera path. Each keyframe is pinned to a scroll position; the camera
 * interpolates between the two surrounding keyframes.
 *
 * Kept separate from CHAPTERS because camera moves do not always align with
 * copy beats -- the camera often starts moving before the next headline
 * arrives, which is what makes it feel directed rather than stepped.
 */
export interface CameraKey {
  at: number;
  position: Vec3;
  lookAt: Vec3;
}

export const CAMERA_PATH: CameraKey[] = [
  { at: 0.0, position: [0, 1.2, 9.5], lookAt: [0, 0.2, 0] },
  { at: 0.06, position: [2.5, 1.6, 8.6], lookAt: [0, 0.4, 0] },
  { at: 0.12, position: [6.2, 2.6, 8.0], lookAt: [0, 0.3, 0] },
  { at: 0.19, position: [6.6, 2.0, 7.2], lookAt: [0, 0.2, 0] },
  { at: 0.28, position: [4.4, 1.6, 6.4], lookAt: [-0.2, 0.5, 0] },
  { at: 0.35, position: [3.2, 2.2, 5.2], lookAt: [-0.15, 1.1, 0] },
  { at: 0.42, position: [2.2, 1.6, 4.2], lookAt: [-0.15, 1.15, 0] },
  // Edge-on: camera drops to the CPU's own height so the stack reads as a
  // profile rather than a plan view.
  { at: 0.48, position: [0, -0.25, 3.4], lookAt: [0, -0.3, 0] },
  { at: 0.58, position: [0, -0.2, 4.8], lookAt: [0, -0.28, 0] },
  { at: 0.70, position: [0, 0.3, 8.4], lookAt: [0, -0.35, 0] },
  { at: 0.76, position: [0, -0.1, 6.0], lookAt: [0, -0.25, 0] },
  { at: 0.80, position: [1.8, 0.6, 5.4], lookAt: [0, -0.1, 0] },
  { at: 0.85, position: [2.4, 0.9, 6.6], lookAt: [0, -0.2, 0] },
  { at: 0.94, position: [0.4, 0.5, 7.0], lookAt: [0, -0.2, 0] },
  { at: 1.0, position: [0, 0.2, 6.2], lookAt: [0, -0.2, 0] },
];

export const cameraAt = (progress: number): { position: Vec3; lookAt: Vec3 } => {
  const path = CAMERA_PATH;
  if (progress <= path[0].at) return { position: path[0].position, lookAt: path[0].lookAt };
  for (let i = 1; i < path.length; i++) {
    if (progress <= path[i].at) {
      const previous = path[i - 1];
      const next = path[i];
      const t = ease((progress - previous.at) / (next.at - previous.at));
      return {
        position: lerpVec(previous.position, next.position, t),
        lookAt: lerpVec(previous.lookAt, next.lookAt, t),
      };
    }
  }
  const last = path[path.length - 1];
  return { position: last.position, lookAt: last.lookAt };
};
