/* ============================================================
   VOIDTUNE — Tweaks panel (index)
   Three expressive controls that reshape the whole feel:
     1. Palette     — re-themes the entire identity + 3D hero
     2. Atmosphere  — density of glow / grain / particles
     3. Geometry    — soft vs. sharp edges + border hardness
   Self-injecting, persisted to localStorage, theme-matched.
   ============================================================ */
(() => {
  'use strict';
  const KEY = 'vt-tweaks-v1';
  const DEFAULTS = { palette: 'violet', atmo: 60, geometry: 'soft' };
  let state = load();

  const PALETTES = {
    violet: { name: 'Void Violet', sw: '#a78bfa', accent: '#a78bfa', deep: '#6d44c8', glow: '#c4b5fd', auroraA: '124,79,255', auroraB: '80,52,200', ring: '167,139,250' },
    toxic:  { name: 'Toxic',       sw: '#7cf26e', accent: '#7cf26e', deep: '#2f9e34', glow: '#b6ffae', auroraA: '70,210,100', auroraB: '34,150,70',  ring: '124,242,110' },
    cryo:   { name: 'Cryo',        sw: '#7dd3fc', accent: '#7dd3fc', deep: '#2f7fc8', glow: '#bfe9ff', auroraA: '70,170,255', auroraB: '40,110,210', ring: '125,211,252' },
    ember:  { name: 'Ember',       sw: '#ff9a5c', accent: '#ff9a5c', deep: '#c84d2f', glow: '#ffce9e', auroraA: '255,120,70', auroraB: '200,60,52', ring: '255,154,92' },
  };

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- apply state to the page ---------- */
  const varsEl = (() => { const s = document.createElement('style'); s.id = 'vt-tweak-vars'; document.head.appendChild(s); return s; })();

  function apply() {
    const p = PALETTES[state.palette] || PALETTES.violet;
    const a = Math.max(0, Math.min(100, state.atmo)) / 100;          // 0..1
    // atmosphere-mapped intensities
    const auroraOp = (0.28 + a * 0.95).toFixed(3);
    const grainOp  = (0.10 + a * 0.55).toFixed(3);
    const orbitOp  = (0.15 + a * 0.85).toFixed(3);
    const canvasOp = (0.35 + a * 0.65).toFixed(3);
    const sharp = state.geometry === 'sharp';
    const rad = sharp ? '0px' : '0.5rem';
    const radPill = sharp ? '2px' : '999px';
    const bStrong = sharp ? 0.30 : 0.16;

    const css = `
:root{
  --violet:${p.accent}; --violet-deep:${p.deep}; --violet-glow:${p.glow};
  --primary:${p.accent}; --vt-accent:${p.accent};
  --border-strong:rgba(244,241,234,${bStrong}); --radius:${rad};
}
.aurora{ opacity:${auroraOp} !important; background:
  radial-gradient(ellipse 80% 50% at 20% 0%, rgba(${p.auroraA},.40), transparent 60%),
  radial-gradient(ellipse 70% 40% at 80% 10%, rgba(${p.ring},.22), transparent 55%),
  radial-gradient(ellipse 90% 60% at 50% 100%, rgba(${p.auroraB},.30), transparent 60%) !important; }
.grain::before{ opacity:${grainOp} !important; }
.hero .orbital{ opacity:${orbitOp} !important; }
.vt-hero-canvas{ opacity:${canvasOp} !important; }
.hero .orbital .o1{ border-color:rgba(${p.ring},.15) !important; }
.hero .orbital .o2{ border-color:rgba(${p.ring},.10) !important; }
.hero .orbital .o3{ border-color:rgba(${p.ring},.05) !important; }
::-webkit-scrollbar-thumb{ background:rgba(${p.deep},.6) !important; }
.text-gradient{ background-image:linear-gradient(180deg,#fbfaff 0%, ${p.glow} 55%, ${p.accent} 100%) !important;
  -webkit-background-clip:text !important; background-clip:text !important;
  -webkit-text-fill-color:transparent !important; color:transparent !important; }
.btn-violet{ background:linear-gradient(180deg, ${p.glow}, ${p.deep}) !important; }
${sharp ? `
.btn,.btn-violet,.btn-ghost,.module,.metric,.glass,.panel,.card,
#demo3d .d3-bezel,#demo3d .d3-screen,#demo3d .d3-panel,#download .fx-win{ border-radius:${rad} !important; }
.btn,.pill,#demo3d .d3-master,#demo3d .d3-replay,#demo3d .d3-chip{ border-radius:${radPill} !important; }
` : ''}
`;
    varsEl.textContent = css;
    document.documentElement.style.setProperty('--radius', rad);
    // recolor the 3D hero canvas(es)
    window.VT_PALETTE_HEX = p.accent;
    (window.VT_HEROES || []).forEach(fn => { try { fn(p.accent); } catch (e) {} });
    syncUI();
  }

  /* ---------- panel UI ---------- */
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
#vt-fab{position:fixed;right:20px;bottom:20px;z-index:200;width:48px;height:48px;border-radius:999px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;border:1px solid var(--border-strong,rgba(244,241,234,.16));
  background:rgba(18,15,24,.78);backdrop-filter:blur(14px) saturate(140%);-webkit-backdrop-filter:blur(14px) saturate(140%);
  color:var(--violet,#a78bfa);box-shadow:0 16px 40px -16px rgba(0,0,0,.8);transition:transform .35s var(--ease,ease),border-color .3s}
#vt-fab:hover{transform:rotate(40deg) scale(1.05);border-color:var(--violet,#a78bfa)}
#vt-fab svg{width:21px;height:21px}
#vt-panel{position:fixed;right:20px;bottom:20px;z-index:201;width:300px;max-width:calc(100vw - 40px);
  border-radius:16px;overflow:hidden;font-family:var(--body,system-ui);color:var(--foreground,#f4f1ea);
  background:linear-gradient(180deg,rgba(28,22,40,.92),rgba(14,11,20,.95));backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(244,241,234,.12);
  box-shadow:0 50px 110px -40px rgba(0,0,0,.92);transform:translateY(16px) scale(.96);opacity:0;pointer-events:none;
  transform-origin:bottom right;transition:transform .42s cubic-bezier(.2,.7,.2,1),opacity .3s}
#vt-panel.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
#vt-panel .hd{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px}
#vt-panel .hd .t{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted-foreground,#9a93a8)}
#vt-panel .hd .t b{color:var(--violet,#a78bfa);font-weight:500}
#vt-panel .hd .x{cursor:pointer;color:var(--muted-foreground,#9a93a8);font-size:16px;line-height:1;padding:4px;border-radius:6px;transition:color .2s}
#vt-panel .hd .x:hover{color:var(--foreground,#fff)}
#vt-panel .grp{padding:14px 18px;border-top:1px solid rgba(244,241,234,.07)}
#vt-panel .lab{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
#vt-panel .lab .n{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.04em;color:var(--foreground)}
#vt-panel .lab .v{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--violet-glow,#c4b5fd)}
.vt-sw{display:flex;gap:9px}
.vt-sw .o{width:30px;height:30px;border-radius:9px;cursor:pointer;border:1.5px solid rgba(244,241,234,.14);
  position:relative;transition:transform .25s,border-color .25s}
.vt-sw .o:hover{transform:translateY(-2px)}
.vt-sw .o.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.12)}
.vt-sw .o.on::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)}
.vt-seg{display:flex;background:rgba(0,0,0,.28);border:1px solid rgba(244,241,234,.1);border-radius:9px;padding:3px}
.vt-seg button{flex:1;padding:8px 6px;border:none;background:transparent;color:var(--muted-foreground,#9a93a8);cursor:pointer;
  font-family:var(--mono,monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;border-radius:6px;transition:all .25s}
.vt-seg button.on{background:linear-gradient(180deg,var(--violet,#a78bfa),var(--violet-deep,#6d44c8));color:#100c1a;font-weight:600}
.vt-range{width:100%;-webkit-appearance:none;appearance:none;height:5px;border-radius:999px;outline:none;cursor:pointer;
  background:linear-gradient(90deg,var(--violet-deep,#6d44c8),var(--violet,#a78bfa) var(--p,60%),rgba(244,241,234,.1) var(--p,60%))}
.vt-range::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;border-radius:50%;background:#fff;
  box-shadow:0 2px 8px rgba(0,0,0,.5);cursor:pointer;border:3px solid var(--violet,#a78bfa)}
.vt-range::-moz-range-thumb{width:17px;height:17px;border-radius:50%;background:#fff;border:3px solid var(--violet,#a78bfa);cursor:pointer}
#vt-panel .ft{padding:11px 18px 15px;border-top:1px solid rgba(244,241,234,.07);display:flex;justify-content:space-between;align-items:center}
#vt-panel .reset{cursor:pointer;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted-foreground,#9a93a8);background:none;border:none;transition:color .2s}
#vt-panel .reset:hover{color:var(--foreground,#fff)}
#vt-panel .hint{font-family:var(--mono,monospace);font-size:9px;letter-spacing:.1em;color:var(--muted-foreground,#9a93a8);opacity:.6}
@media (prefers-reduced-motion:reduce){#vt-fab,#vt-panel{transition:none}}
`;
    document.head.appendChild(s);
  }

  let ui = {};
  function buildPanel() {
    const fab = document.createElement('div');
    fab.id = 'vt-fab'; fab.setAttribute('role', 'button'); fab.setAttribute('aria-label', 'Open tweaks');
    fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

    const panel = document.createElement('div');
    panel.id = 'vt-panel';
    const swatches = Object.entries(PALETTES).map(([k, p]) =>
      `<div class="o" data-pal="${k}" title="${p.name}" style="background:linear-gradient(135deg,${p.glow},${p.deep})"></div>`).join('');
    panel.innerHTML = `
      <div class="hd"><span class="t">VOIDTUNE · <b>Tweaks</b></span><span class="x" role="button" aria-label="Close">✕</span></div>
      <div class="grp">
        <div class="lab"><span class="n">Palette</span><span class="v" data-out="palette"></span></div>
        <div class="vt-sw" data-ctl="palette">${swatches}</div>
      </div>
      <div class="grp">
        <div class="lab"><span class="n">Atmosphere</span><span class="v" data-out="atmo"></span></div>
        <input class="vt-range" type="range" min="0" max="100" step="1" data-ctl="atmo">
      </div>
      <div class="grp">
        <div class="lab"><span class="n">Geometry</span><span class="v" data-out="geometry"></span></div>
        <div class="vt-seg" data-ctl="geometry">
          <button data-geo="soft">Soft</button><button data-geo="sharp">Sharp</button>
        </div>
      </div>
      <div class="ft"><button class="reset">Reset</button><span class="hint">Saved to this browser</span></div>`;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    ui = { fab, panel,
      swatches: [...panel.querySelectorAll('[data-pal]')],
      range: panel.querySelector('[data-ctl="atmo"]'),
      geoBtns: [...panel.querySelectorAll('[data-geo]')],
      outPal: panel.querySelector('[data-out="palette"]'),
      outAtmo: panel.querySelector('[data-out="atmo"]'),
      outGeo: panel.querySelector('[data-out="geometry"]') };

    const open = () => { panel.classList.add('open'); fab.style.opacity = '0'; fab.style.pointerEvents = 'none'; };
    const close = () => { panel.classList.remove('open'); fab.style.opacity = ''; fab.style.pointerEvents = ''; };
    fab.addEventListener('click', open);
    panel.querySelector('.x').addEventListener('click', close);

    ui.swatches.forEach(o => o.addEventListener('click', () => { state.palette = o.dataset.pal; save(); apply(); }));
    ui.range.addEventListener('input', () => { state.atmo = +ui.range.value; save(); apply(); });
    ui.geoBtns.forEach(b => b.addEventListener('click', () => { state.geometry = b.dataset.geo; save(); apply(); }));
    panel.querySelector('.reset').addEventListener('click', () => { state = Object.assign({}, DEFAULTS); save(); apply(); });
  }

  function syncUI() {
    if (!ui.range) return;
    const p = PALETTES[state.palette] || PALETTES.violet;
    ui.swatches.forEach(o => o.classList.toggle('on', o.dataset.pal === state.palette));
    ui.geoBtns.forEach(b => b.classList.toggle('on', b.dataset.geo === state.geometry));
    ui.range.value = state.atmo;
    ui.range.style.setProperty('--p', state.atmo + '%');
    ui.outPal.textContent = p.name;
    ui.outAtmo.textContent = state.atmo < 33 ? 'Calm' : state.atmo < 72 ? 'Balanced' : 'Overkill';
    ui.outGeo.textContent = state.geometry === 'sharp' ? 'Sharp' : 'Soft';
  }

  function boot() { injectStyles(); buildPanel(); apply(); }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
