import type { DisassemblyStep, PartTransform } from '../types';

/**
 * Layout of the 3D PC, as data.
 *
 * Deliberately procedural boxes rather than an imported model: a downloaded PC
 * model would need its parts split, named and re-rigged to be individually
 * removable anyway, and the educational point is which part sits where and
 * what it connects to -- not photorealism. PART_IDS match the backend's
 * component ids so /api/components supplies every description.
 *
 * Coordinates: X = left/right across the case, Y = up, Z = front/back.
 * The case interior spans roughly x[-1.6,1.6], y[-2.2,2.2], z[-0.9,0.9].
 */
export const PARTS: PartTransform[] = [
  // Tempered-glass side panel: drawn transparent both because modern cases
  // really are built that way and because an opaque panel would hide the
  // entire interior this scene exists to show.
  { id: 'side_panel', position: [1.72, 0, 0], removedOffset: [2.2, 0, 0], size: [0.05, 4.4, 1.9], color: '#93a4c4' },
  { id: 'case', position: [0, 0, 0], removedOffset: [0, 0, 0], size: [3.3, 4.4, 1.9], color: '#2b303a' },
  { id: 'motherboard', position: [-0.15, 0.35, -0.75], removedOffset: [0, 0, 0], size: [2.5, 3.1, 0.08], color: '#2f7d5a' },
  { id: 'cpu_socket', position: [-0.15, 1.15, -0.66], removedOffset: [0, 0, 0], size: [0.62, 0.62, 0.06], color: '#8b98ad' },
  { id: 'cpu', position: [-0.15, 1.15, -0.6], removedOffset: [0, 1.5, 1.1], size: [0.5, 0.5, 0.06], color: '#dfe4ec' },
  { id: 'cpu_cooler', position: [-0.15, 1.15, -0.22], removedOffset: [0, 1.7, 1.3], size: [0.95, 0.95, 0.6], color: '#aab3c2' },
  { id: 'ram', position: [0.75, 1.2, -0.66], removedOffset: [0, 1.4, 0.9], size: [0.13, 1.05, 0.07], color: '#9f7aea' },
  { id: 'ram2', position: [0.97, 1.2, -0.66], removedOffset: [0, 1.4, 0.9], size: [0.13, 1.05, 0.07], color: '#9f7aea' },
  { id: 'gpu', position: [-0.15, -0.15, -0.42], removedOffset: [0, 0.3, 1.7], size: [2.1, 0.42, 0.55], color: '#5a6478' },
  { id: 'storage', position: [-1.15, 0.1, -0.62], removedOffset: [-1.2, 0, 1.0], size: [0.5, 0.32, 0.07], color: '#48bb78' },
  { id: 'psu', position: [0, -1.75, -0.35], removedOffset: [0, -0.9, 1.6], size: [2.6, 0.85, 1.1], color: '#3d4351' },
  { id: 'fan_front', position: [-1.45, 0.9, 0.35], removedOffset: [-1.5, 0, 0.8], size: [0.16, 1.0, 1.0], color: '#7b879b' },
  { id: 'fan_rear', position: [1.35, 1.5, -0.2], removedOffset: [1.5, 0, 0.8], size: [0.16, 0.85, 0.85], color: '#7b879b' },
  { id: 'cables', position: [0.55, -1.0, -0.28], removedOffset: [0, -0.5, 1.5], size: [0.9, 0.7, 0.35], color: '#2a2f38' },
];

/** ram2 is a second physical stick of the same component type -- it shares
 * ram's description rather than having its own backend entry. */
export const PART_TO_COMPONENT: Record<string, string> = {
  ram2: 'ram',
  side_panel: 'case',
};

export const componentIdFor = (partId: string) => PART_TO_COMPONENT[partId] ?? partId;

export const DISASSEMBLY: DisassemblyStep[] = [
  {
    index: 0,
    parts: [],
    title: 'Assembled system',
    explanation:
      'A complete desktop PC. Every part is mounted to the case and connected to the motherboard or the power supply. Step through to take it apart in the order you would in reality -- outermost and most obstructive parts first.',
    camera: [7.6, 3.4, 8.2],
    lookAt: [0, 0.55, 0],
  },
  {
    index: 1,
    parts: ['side_panel'],
    title: 'Remove the side panel',
    explanation:
      'The side panel is structural and part of the airflow path, but nothing is mounted to it. It comes off first because every other part is behind it.',
    camera: [7.0, 2.8, 7.4],
    lookAt: [0, 0.5, 0],
  },
  {
    index: 2,
    parts: ['side_panel', 'cables'],
    title: 'Disconnect the power cables',
    explanation:
      'Power is disconnected before anything is unseated. The 24-pin feeds the motherboard, a separate 8-pin EPS feeds the CPU, and the GPU has its own connectors -- three independent runs from the same PSU.',
    camera: [6.0, 0.4, 6.8],
    lookAt: [0.3, -0.6, 0],
  },
  {
    index: 3,
    parts: ['side_panel', 'cables', 'gpu'],
    title: 'Remove the GPU',
    explanation:
      'The graphics card releases from a retention clip at the end of the PCIe x16 slot. It sits directly under the CPU cooler area and blocks access to the lower board, so it comes out before the cooler.',
    camera: [5.6, 1.2, 6.6],
    lookAt: [0, 0.1, 0],
  },
  {
    index: 4,
    parts: ['side_panel', 'cables', 'gpu', 'ram', 'ram2'],
    title: 'Remove the RAM',
    explanation:
      'Retention clips at each end of the DIMM slots release the modules. These two sticks are in the dual-channel pair -- populating the correct slots is what enables the second channel and roughly doubles memory bandwidth.',
    camera: [4.6, 2.2, 6.0],
    lookAt: [0.4, 1.0, 0],
  },
  {
    index: 5,
    parts: ['side_panel', 'cables', 'gpu', 'ram', 'ram2', 'cpu_cooler'],
    title: 'Remove the CPU cooler',
    explanation:
      'The cooler unbolts from its backplate. Underneath, thermal paste fills the microscopic gaps between the cooler base and the CPU lid -- it is a gap filler, not a conductor upgrade, which is why more paste is not better.',
    camera: [4.6, 2.8, 6.4],
    lookAt: [-0.1, 1.1, 0],
  },
  {
    index: 6,
    parts: ['side_panel', 'cables', 'gpu', 'ram', 'ram2', 'cpu_cooler', 'cpu'],
    title: 'Open the socket and remove the CPU',
    explanation:
      'The retention arm lifts and the CPU comes straight out with no force. On an LGA socket the pins are in the socket, not on the chip -- bending them is a motherboard repair, not a CPU one.',
    camera: [4.2, 2.6, 6.0],
    lookAt: [-0.15, 1.1, -0.4],
  },
  {
    index: 7,
    parts: ['side_panel', 'cables', 'gpu', 'ram', 'ram2', 'cpu_cooler', 'cpu', 'storage', 'psu', 'fan_front', 'fan_rear'],
    title: 'Bare motherboard',
    explanation:
      'What remains is the board itself: the socket, the slots, and the traces between them. The empty socket is the entry point to the next scene -- everything from here inward is inside the CPU.',
    camera: [3.4, 2.0, 6.4],
    lookAt: [-0.15, 0.6, -0.7],
  },
];
