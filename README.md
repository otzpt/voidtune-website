# VOIDTUNE 3D

An interactive 3D walkthrough of a PC: explore it, take it apart, go inside the
CPU, follow software down to the hardware, and see where VOIDTUNE fits.

The 3D scene is the interface. The backend serves the content and the real
VOIDTUNE tweak catalog; a C helper measures this machine's actual cache
hierarchy.

```
PC → motherboard → components → CPU → CPU internals → software/OS → VOIDTUNE
```

## Architecture

```
frontend/   React + TypeScript + Vite + react-three-fiber (the experience)
backend/    FastAPI (content API, typed Pydantic models)
c/          cpuinfo.c (CPU topology + measured memory latency)
docs/       sourcing notes
```

**Why each language is here**, rather than everything in TypeScript:

- **TypeScript** — the 3D scenes and app logic. Types mirror the backend models.
- **Python/FastAPI** — content and data processing, including parsing VOIDTUNE's
  C# tweak catalog into JSON.
- **C** — `c/cpuinfo.c` reads the kernel's cache topology and *measures* memory
  latency by pointer-chasing a shuffled cycle so each load depends on the last.
  That measurement is the reason C is here: it demonstrates the cache hierarchy
  by experiment instead of asserting textbook numbers. On the build machine the
  steps land exactly at the reported cache sizes:

  | working set | latency | level |
  | --- | --- | --- |
  | 4–32 KB | ~1.0 ns | L1 (32 KB) |
  | 64 KB–1 MB | 2.3–5.6 ns | L2 (1 MB) |
  | 2–16 MB | 9–25 ns | L3 (32 MB) |
  | 32–64 MB | 62–76 ns | main memory |

## What is real and what is not

Stated explicitly because the brief for this project required it:

- **Real**: the VOIDTUNE catalog (177 tweaks, parsed from `TweakCatalog.cs` in
  the VOIDTUNE repo by `backend/extract_catalog.py`), every tweak name,
  description, tier and category; the CPU cache topology and latency
  measurements from `c/cpuinfo.c`.
- **Simulated**: the system-activity dashboard. The API returns
  `"simulated": true` and the UI labels the panel from that field, so it cannot
  quietly start presenting invented numbers as this machine's.
- **Simplified**: the CPU layer stack is a conceptual ordering, not a floorplan
  of any real processor — the lower layers are progressively smaller structures
  inside the die, not slices beneath it. The UI says so on screen.
- **Procedural geometry**: the PC is built from boxes, not an imported model. A
  downloaded model would need its parts split and renamed to be individually
  removable anyway, and the educational point is what each part is and how it
  connects.
  `frontend/src/scenes/pcLayout.ts` is pure data, so swapping in real meshes
  later does not touch the application code.

## Setup

Two processes: the API and the frontend.

```bash
# 1. backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000

# 2. frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
```

Optional — regenerate the machine-specific data:

```bash
cc -O2 -o c/cpuinfo c/cpuinfo.c
./c/cpuinfo --latency > backend/data/hostinfo.json   # takes a few minutes

# re-parse the VOIDTUNE catalog from a local clone of the repo
python3 backend/extract_catalog.py ~/Projectos/VOIDTUNE > backend/data/tweaks.json
```

## Commands

| Where | Command | What |
| --- | --- | --- |
| `frontend/` | `npm run dev` | dev server with API proxy |
| `frontend/` | `npm run build` | typecheck + production build |
| `frontend/` | `npm run lint` | oxlint |
| `frontend/` | `node --experimental-strip-types src/scenes/pcLayout.test.ts` | validates scene data |
| `backend/` | `.venv/bin/uvicorn main:app --port 8000` | API |
| `c/` | `cc -O2 -o cpuinfo cpuinfo.c && ./cpuinfo --latency` | measure this machine |

## API

| Endpoint | Returns |
| --- | --- |
| `GET /api/components` | PC components, descriptions, connections |
| `GET /api/architecture` | CPU layers, pipeline stages, units, software stack |
| `GET /api/voidtune` | What VOIDTUNE is, does, and does not do |
| `GET /api/optimizations` | The real tweak catalog grouped by category, each mapped to the component it affects |
| `GET /api/host` | CPU topology from the C helper |
| `GET /api/host/latency` | Measured cache latency curve |
| `GET /api/system` | Simulated telemetry (always flagged `simulated: true`) |

Every endpoint is consumed by the frontend; none exist only to pad the surface.

## Controls

Drag to rotate · scroll to zoom · right-drag to pan · click any part for its
panel.

| Key | Action |
| --- | --- |
| `1`–`5` | jump to a section |
| `←` / `→` | previous / next disassembly step |
| `Esc` | close the info panel |
| `R` | reset the scene |
| `Space` | pause/resume animations |

`?scene=cpu` in the URL deep-links a section.

## Accessibility

- Motion toggle in the nav; `prefers-reduced-motion` is respected by default.
- Keyboard navigation for sections and the disassembly sequence.
- 3D labels are real DOM text, not rendered textures, so they are selectable and
  reachable by a screen reader.
- **No WebGL, no problem**: the full content renders as a text document instead.
  The educational material never depends on the 3D working.

## Performance notes

- Animation happens in `useFrame` against object refs, never through React
  state — re-rendering React every frame to move a mesh is the standard R3F
  mistake.
- Lerp factors are frame-rate independent (`1 - pow(k, delta)`), so motion is
  the same speed at 60 and 144 Hz.
- Device pixel ratio capped at 2.
- `material.transparent` is set once at declaration rather than toggled per
  frame: changing it at runtime needs `needsUpdate` to recompile the shader,
  and getting that wrong silently breaks every opacity animation (it did, once
  — see the highlight/isolate behaviour in the VOIDTUNE section).

## Known limitations

- The PC geometry is representational, not dimensionally accurate.
- Reassembly is stepping backwards through the sequence (`←`), not a separate
  build-it-yourself mode.
- `backend/data/hostinfo.json` is measured on whatever machine ran the C
  helper; it is committed so the site has real numbers even when deployed
  somewhere that cannot run it.
