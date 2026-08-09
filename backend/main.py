"""VOIDTUNE 3D -- backend API.

Serves the educational content and the real VOIDTUNE tweak catalog to the
frontend. Content lives in data/*.json rather than inline in Python so it can
be edited without touching code, and so extract_catalog.py can regenerate the
tweak data straight from the VOIDTUNE repo.
"""
import json
import math
import random
import subprocess
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    Architecture,
    Component,
    HostInfo,
    OptimizationGroup,
    SystemSnapshot,
    Tweak,
    VoidtuneInfo,
)

DATA = Path(__file__).parent / 'data'
C_BINARY = Path(__file__).parent.parent / 'c' / 'cpuinfo'

app = FastAPI(
    title='VOIDTUNE 3D API',
    description='Content and hardware data for the VOIDTUNE interactive 3D experience.',
    version='1.0.0',
)

# The frontend dev server runs on a different port than the API, so the browser
# treats it as cross-origin. Restricted to localhost dev ports plus the
# deployed origin rather than "*" -- this API is read-only, but a wildcard
# would let any site on the internet embed it.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://voidtune-website.vercel.app',
    ],
    allow_methods=['GET'],
    allow_headers=['*'],
)


def load(name: str):
    path = DATA / name
    if not path.exists():
        raise HTTPException(500, f'missing data file: {name}')
    return json.loads(path.read_text(encoding='utf-8'))


# Which 3D component each tweak category acts on. Used by the frontend to
# highlight the affected part when a category is selected. Categories with no
# single physical component (Debloat, Privacy, Restore) map to None on purpose
# rather than being forced onto an unrelated part.
CATEGORY_TO_COMPONENT = {
    'CPU': 'cpu',
    'GPU': 'gpu',
    'RAM': 'ram',
    'Storage': 'storage',
    'Power': 'psu',
    'Network': 'motherboard',
    'Audio': 'motherboard',
    'Latency': 'cpu',
    'Game': 'cpu',
    'Processes': None,
    'Background': None,
    'Debloat': None,
    'Privacy': None,
    'Restore': None,
}


@app.get('/api/components', response_model=list[Component])
def get_components():
    """The physical PC components, their descriptions and how they connect."""
    return load('components.json')


@app.get('/api/architecture', response_model=Architecture)
def get_architecture():
    """CPU layers, pipeline stages, functional units and the software stack."""
    return load('architecture.json')


@app.get('/api/voidtune', response_model=VoidtuneInfo)
def get_voidtune():
    """What VOIDTUNE is. Every claim here is sourced from the VOIDTUNE repo's
    own README and tweak catalog -- see docs/SOURCES.md."""
    tweaks = load('tweaks.json')
    return {
        'name': 'VOIDTUNE',
        'version': '0.8.18',
        'edition': 'C# / WinUI 3 (Windows App SDK)',
        'platform': 'Windows 10/11 (x64)',
        'license': 'GPL v3',
        'repo': 'https://github.com/otzpt/VOIDTUNE',
        'summary': (
            'A Windows optimization suite. It applies reversible system tweaks -- registry '
            'values, service start types, power plan settings -- and verifies which are '
            'already active on the machine.'
        ),
        'what_it_does': [
            'Applies reversible tweaks, each with an explicit revert command.',
            'Gates tweaks on real hardware and OS: Intel/AMD/NVIDIA-specific tweaks only appear on matching hardware, Windows 11-only tweaks only on Windows 11.',
            'Treats laptops differently from desktops, because max-performance power settings measurably reduce FPS on thermally limited machines.',
            'Verifies live system state at startup instead of trusting its own saved settings.',
            'Separates SAFE from EXTREME tiers, with EXTREME opt-in only.',
        ],
        'what_it_does_not_do': [
            'It does not patch the kernel or load a driver -- it is a user-space application changing documented OS configuration.',
            'It does not overclock. Clocks, voltages and timings are untouched.',
            'It does not claim gains it cannot support: the Tweak Validator exists to measure whether tweaks actually helped on your machine, including a thermal-throttle detector.',
        ],
        'total_tweaks': len(tweaks),
    }


@app.get('/api/optimizations', response_model=list[OptimizationGroup])
def get_optimizations():
    """The real tweak catalog, grouped by category and mapped to the 3D
    component each category affects."""
    tweaks = load('tweaks.json')
    groups: dict[str, list[dict]] = {}
    for tweak in tweaks:
        groups.setdefault(tweak['category'], []).append(tweak)
    return [
        {
            'category': category,
            'component_id': CATEGORY_TO_COMPONENT.get(category),
            'count': len(items),
            'tweaks': items,
        }
        for category, items in sorted(groups.items(), key=lambda kv: -len(kv[1]))
    ]


@app.get('/api/host', response_model=HostInfo)
def get_host():
    """Real CPU topology and measured cache latency from the C helper.

    Served from the cached run in data/hostinfo.json: the latency walk takes
    minutes, so measuring it per-request would make the endpoint unusable.
    """
    try:
        data = load('hostinfo.json')
    except HTTPException:
        return {'available': False, 'source': 'not measured', 'fields': {}}
    caches = ', '.join(f"L{c['level']} {c['type'][:1]} {c['size_kb']}KB" for c in data.get('caches', []))
    return {
        'available': data.get('available', False),
        'source': data.get('source', ''),
        'fields': {
            'cores_online': str(data.get('cores_online', '')),
            'cache_line_bytes': str(data.get('cache_line_bytes', '')),
            'page_size_bytes': str(data.get('page_size_bytes', '')),
            'caches': caches,
        },
    }


@app.get('/api/host/latency')
def get_latency():
    """Measured memory latency by working-set size -- the cache hierarchy shown
    by measurement rather than assertion. Produced by c/cpuinfo.c."""
    data = load('hostinfo.json')
    return {
        'source': data.get('source', ''),
        'caches': data.get('caches', []),
        'latency': data.get('latency', []),
    }


@app.get('/api/system', response_model=SystemSnapshot)
def get_system():
    """Simulated system telemetry for the dashboard.

    Deliberately synthetic and flagged as such in the response: this is a
    website about how a PC works, not a monitoring tool, and reporting the
    server's own load as if it were the visitor's machine would be a lie the
    UI could not detect. The frontend reads `simulated` to label the panel.
    """
    now = time.time()
    # Smooth, deterministic-ish movement: sine waves at different periods
    # rather than pure random, so values drift the way real load does instead
    # of flickering every poll.
    base = (math.sin(now / 7) + 1) / 2
    cpu = 18 + base * 55 + random.uniform(-3, 3)
    cpu = max(2.0, min(99.0, cpu))
    cores = [max(1.0, min(100.0, cpu + random.uniform(-22, 22))) for _ in range(12)]
    gpu = max(2.0, min(99.0, 12 + ((math.sin(now / 11) + 1) / 2) * 70 + random.uniform(-4, 4)))
    return {
        'simulated': True,
        'cpu_usage': round(cpu, 1),
        'cpu_frequency_ghz': round(3.4 + (cpu / 100) * 1.8, 2),
        'cores': [round(c, 1) for c in cores],
        'ram_used_gb': round(9.2 + ((math.sin(now / 23) + 1) / 2) * 5, 1),
        'ram_total_gb': 32.0,
        'gpu_usage': round(gpu, 1),
        'vram_used_gb': round(2.1 + (gpu / 100) * 5.5, 1),
        'vram_total_gb': 12.0,
        'storage_read_mbs': round(max(0, ((math.sin(now / 5) + 1) / 2) * 900 + random.uniform(-40, 40)), 1),
        'storage_write_mbs': round(max(0, ((math.sin(now / 9) + 1) / 2) * 420 + random.uniform(-30, 30)), 1),
        'network_mbps': round(max(0, ((math.sin(now / 13) + 1) / 2) * 180 + random.uniform(-15, 15)), 1),
    }


@app.get('/api/health')
def health():
    return {'ok': True, 'service': 'voidtune-3d-api'}
