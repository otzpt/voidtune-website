/* ============================================================
   VOIDTUNE — animated terminal
   Reads a JSON "script" inside [data-term] and plays it:
   typed commands, streamed AI output, progress bars. Loops.
   Themed by the page's --accent. Timer-driven, paused
   offscreen, reduced-motion renders a static final frame.
   ============================================================ */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(term) {
    const screen = term.querySelector('.term-screen');
    const prompt = term.getAttribute('data-prompt') || '$';
    let steps = [];
    try { steps = JSON.parse(term.querySelector('.term-script').textContent); } catch (e) { return; }

    let timers = [], running = false, started = false;
    const T = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
    const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
    const scrollEnd = () => { screen.scrollTop = screen.scrollHeight; };

    function line(cls) {
      const d = document.createElement('div');
      d.className = 'ln' + (cls ? ' ' + cls : '');
      screen.appendChild(d); scrollEnd(); return d;
    }
    function cursorOn(el) {
      const c = document.createElement('span'); c.className = 'cur'; el.appendChild(c); return c;
    }

    function typeCmd(text, done) {
      const d = line();
      const pr = document.createElement('span'); pr.className = 'pr'; pr.textContent = prompt + ' '; d.appendChild(pr);
      const span = document.createElement('span'); d.appendChild(span);
      const cur = cursorOn(d);
      let i = 0;
      (function step() {
        if (!running) return;
        span.textContent = text.slice(0, ++i);
        scrollEnd();
        if (i < text.length) T(step, 26 + Math.random() * 40);
        else { cur.remove(); T(done, 360); }
      })();
    }
    function stream(text, cls, done) {
      const d = line(cls || 'ai');
      const words = text.split(' ');
      let i = 0;
      (function step() {
        if (!running) return;
        d.textContent = words.slice(0, ++i).join(' ');
        scrollEnd();
        if (i < words.length) T(step, 38 + Math.random() * 50);
        else T(done, 300);
      })();
    }
    function bar(label, ms, doneText, done) {
      const d = line('dim');
      d.textContent = label + ' ';
      const wrap = document.createElement('span'); wrap.className = 'term-prog';
      const fill = document.createElement('i'); wrap.appendChild(fill); d.appendChild(wrap);
      const pct = document.createElement('span'); pct.className = 'pct'; d.appendChild(pct);
      const t0 = performance.now();
      const id = setInterval(() => {
        if (!running) { clearInterval(id); return; }
        const v = Math.min(100, ((performance.now() - t0) / ms) * 100);
        fill.style.width = v + '%'; pct.textContent = ' ' + Math.round(v) + '%';
        if (v >= 100) {
          clearInterval(id);
          if (doneText) { const r = line('ok'); r.textContent = doneText; }
          T(done, 260);
        }
      }, 40);
      timers.push(id);
    }

    let idx = 0;
    function run() {
      if (!running) return;
      if (idx >= steps.length) { const last = line(); const c = cursorOn(last); T(loop, 2600); return; }
      const s = steps[idx++];
      if (s.clr) { screen.innerHTML = ''; T(run, 250); }
      else if (s.p != null) typeCmd(s.p, run);
      else if (s.s != null) stream(s.s, s.c, run);
      else if (s.bar != null) bar(s.bar, s.ms || 1200, s.done, run);
      else if (s.o != null) { const d = line(s.c); d.textContent = s.o; T(run, s.w || 360); }
      else if (s.w != null) T(run, s.w);
      else run();
    }
    function loop() { clearTimers(); screen.innerHTML = ''; idx = 0; run(); }

    function renderStatic() {
      screen.innerHTML = '';
      for (const s of steps) {
        if (s.clr) { screen.innerHTML = ''; continue; }
        if (s.p != null) { const d = line(); d.innerHTML = '<span class="pr">' + prompt + ' </span>'; d.appendChild(document.createTextNode(s.p)); }
        else if (s.s != null) { const d = line(s.c || 'ai'); d.textContent = s.s; }
        else if (s.bar != null && s.done) { const d = line('ok'); d.textContent = s.done; }
        else if (s.o != null) { const d = line(s.c); d.textContent = s.o; }
      }
      scrollEnd();
    }

    if (RM) { renderStatic(); return; }

    const start = () => { if (!running) { running = true; if (!started) { started = true; loop(); } } };
    const stop = () => { running = false; clearTimers(); };
    const inView = () => { const r = term.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0; };
    const tick = () => { (document.hidden || !inView()) ? stop() : start(); };
    let st = 0;
    addEventListener('scroll', () => { if (st) return; st = setTimeout(() => { st = 0; tick(); }, 120); }, { passive: true });
    document.addEventListener('visibilitychange', tick);
    // poll until first start (covers environments where scroll/rAF are throttled)
    const poll = setInterval(() => { if (started) { clearInterval(poll); return; } tick(); }, 400);
    term.__t = { start, stop, loop };
    tick();
  }

  function boot() { document.querySelectorAll('[data-term]').forEach(mount); }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
