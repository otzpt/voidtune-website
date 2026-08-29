/* ============================================================
   VOIDTUNE — download-side File Explorer animation
   Loop: download .zip → extract → browse folder →
   right-click VOIDTUNE.exe → Run as admin → UAC → launch.
   Timer-driven (no rAF), paused offscreen, reduced-motion safe.
   ============================================================ */
(() => {
  'use strict';
  const win = document.getElementById('fxwin');
  if (!win) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const body = win.querySelector('.fx-body');
  const title = win.querySelector('.fx-tt .fx-title-txt');
  const addr = win.querySelector('.fx-addr-txt');
  const statusL = win.querySelector('.fx-status .l');
  const dlFill = win.querySelector('.fx-dl .fill');
  const dlPct = win.querySelector('.fx-dl .pct');
  const dlState = win.querySelector('.fx-dl .state');
  const exFill = win.querySelector('.fx-extract .fill');
  const exPct = win.querySelector('.fx-extract .pct');
  const batRow = win.querySelector('.fx-row.bat');
  const menu = win.querySelector('.fx-menu');
  const admin = win.querySelector('.fx-mi.admin');
  const uacYes = win.querySelector('.fx-uac .yes');
  const cursor = win.querySelector('.fx-cursor');

  let timers = [], ivs = [], paused = false, started = false;
  const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; ivs.forEach(clearInterval); ivs = []; };

  function moveCursor(el, ox = 0, oy = 0) {
    if (!el) return;
    const b = body.getBoundingClientRect(), r = el.getBoundingClientRect();
    cursor.style.left = (r.left - b.left + r.width / 2 + ox) + 'px';
    cursor.style.top = (r.top - b.top + r.height / 2 + oy) + 'px';
  }
  function click() { cursor.classList.add('click'); T(() => cursor.classList.remove('click'), 300); }
  function ramp(fill, pct, dur, done) {
    const t0 = performance.now();
    const id = setInterval(() => {
      const v = Math.min(100, ((performance.now() - t0) / dur) * 100);
      fill.style.width = v + '%'; pct.textContent = Math.round(v) + '%';
      if (v >= 100) { clearInterval(id); done && done(); }
    }, 45);
    ivs.push(id);
  }
  const phase = (p) => win.setAttribute('data-phase', p);

  function cycle() {
    clearAll();
    // ---- reset / phase 1: download ----
    phase('dl');
    title.textContent = 'Downloads'; addr.textContent = 'This PC › Downloads';
    statusL.textContent = 'Downloading 1 item…';
    dlFill.style.width = '0%'; dlPct.textContent = '0%'; dlState.textContent = 'Downloading…';
    batRow.classList.remove('sel'); menu.classList.remove('show'); admin.classList.remove('flash');
    moveCursor(win.querySelector('.fx-main'), 20, 30);

    ramp(dlFill, dlPct, 2100, () => {
      dlState.textContent = 'Download complete';
      statusL.textContent = 'VOIDTUNE-0.8.10-portable.zip';
      // ---- phase 2: extract ----
      T(() => {
        phase('extract'); statusL.textContent = 'Extracting…';
        exFill.style.width = '0%'; exPct.textContent = '0%';
        ramp(exFill, exPct, 1900, () => {
          // ---- phase 3: browse folder ----
          T(() => {
            phase('folder');
            title.textContent = 'VOIDTUNE-0.8.10-portable';
            addr.textContent = 'Downloads › VOIDTUNE-0.8.10-portable';
            statusL.textContent = '7 items';
            T(() => { moveCursor(batRow); batRow.classList.add('sel'); }, 550);
            T(() => {
              phase('menu');
              const b = body.getBoundingClientRect(), r = batRow.getBoundingClientRect();
              let mx = r.left - b.left + 70, my = r.top - b.top + 16;
              mx = Math.min(mx, b.width - 200); my = Math.min(my, b.height - 150);
              menu.style.left = mx + 'px'; menu.style.top = my + 'px';
              menu.classList.add('show');
            }, 1450);
            T(() => moveCursor(admin), 2050);
            T(() => { click(); admin.classList.add('flash'); }, 2650);
            // ---- phase 4: UAC ----
            T(() => {
              admin.classList.remove('flash'); phase('uac');
              statusL.textContent = 'Requesting administrator…';
              T(() => moveCursor(uacYes), 520);
              T(() => click(), 1120);
              // ---- phase 5: run ----
              T(() => { phase('run'); statusL.textContent = 'Launching VOIDTUNE.exe'; }, 1500);
              T(scheduleNext, 4200);
            }, 3000);
          }, 520);
        });
      }, 750);
    });
  }
  function scheduleNext() { T(() => { paused ? scheduleNext() : cycle(); }, 700); }

  // ---- boot ----
  if (RM) {
    phase('folder'); title.textContent = 'VOIDTUNE-0.8.10-portable';
    addr.textContent = 'Downloads › VOIDTUNE-0.8.10-portable'; statusL.textContent = '7 items';
    batRow.classList.add('sel'); return;
  }
  const inView = () => { const r = win.getBoundingClientRect(); return r.top < innerHeight * 0.9 && r.bottom > 0; };
  const tick = () => {
    paused = document.hidden || !inView();
    if (!started && !paused) { started = true; cycle(); }
  };
  let st = false;
  addEventListener('scroll', () => { if (st) return; st = true; requestAnimationFrame(() => { tick(); st = false; }); }, { passive: true });
  document.addEventListener('visibilitychange', tick);
  win.__fx = { cycle, phase };
  setTimeout(() => { if (!started && inView()) { started = true; cycle(); } }, 700);
  tick();
})();
