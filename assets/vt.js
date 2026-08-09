/* ============================================================
   VOIDTUNE — interaction engine
   One lightweight pass: 3D hero canvas, depth parallax,
   cursor spotlight, card tilt, scroll reveal, nav + progress.
   Performance budget: ~200 sprites/frame, cached glow,
   DPR<=2, rAF paused offscreen/hidden, reduced-motion safe.
   ============================================================ */
(() => {
  'use strict';
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;

  const readAccent = (el) => {
    const a = el.getAttribute('data-accent');
    if (a) return a;
    const cs = getComputedStyle(document.documentElement);
    return (cs.getPropertyValue('--accent') || cs.getPropertyValue('--violet') ||
            cs.getPropertyValue('--primary') || '#a78bfa').trim();
  };
  const hexToRgb = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  /* ---------- pre-rendered glow sprite (drawn, never shadowBlur) ---------- */
  function glowSprite(rgb, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    grd.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
    grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /* ---------- icosahedron geometry ---------- */
  function icosa() {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    // normalize to unit-ish radius
    const s = 1 / Math.sqrt(1 + t * t);
    for (const p of v) { p[0] *= s; p[1] *= s; p[2] *= s; }
    // edges: vertices whose squared distance ~ min
    const edges = [];
    let min = Infinity;
    for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++) {
        const d = (v[i][0]-v[j][0])**2 + (v[i][1]-v[j][1])**2 + (v[i][2]-v[j][2])**2;
        if (d < min - 1e-6) min = d;
      }
    for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++) {
        const d = (v[i][0]-v[j][0])**2 + (v[i][1]-v[j][1])**2 + (v[i][2]-v[j][2])**2;
        if (Math.abs(d - min) < 1e-4) edges.push([i, j]);
      }
    return { v, edges };
  }

  /* ---------- fibonacci sphere of particles ---------- */
  function sphere(n, rad) {
    const pts = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = ga * i;
      pts.push([Math.cos(th) * r * rad, y * rad, Math.sin(th) * r * rad]);
    }
    return pts;
  }

  function mountHero(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    let rgb = hexToRgb(readAccent(canvas));
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let SP = glowSprite(rgb, 64);
    const geo = icosa();
    const parts = sphere(170, 1.46);
    let W = 0, H = 0, cx = 0, cy = 0, scale = 1;
    // allow live recolor (tweaks panel)
    (window.VT_HEROES = window.VT_HEROES || []).push((hex) => { rgb = hexToRgb(hex); SP = glowSprite(rgb, 64); });

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      cx = W / 2; cy = H / 2;
      scale = Math.min(W, H) * 0.32;
    }

    // rotation state + pointer-driven target
    let rx = -0.5, ry = 0.4, vrx = 0, vry = 0;
    let tgx = 0, tgy = 0;            // pointer target (-1..1)
    let px = 0, py = 0;              // smoothed pointer
    const proj = (p, sn, cs, sn2, cs2) => {
      // rotate Y then X
      let x = p[0] * cs + p[2] * sn;
      let z = -p[0] * sn + p[2] * cs;
      let y = p[1] * cs2 - z * sn2;
      z = p[1] * sn2 + z * cs2;
      const f = 3.2 / (3.2 + z);     // perspective
      return [cx + x * scale * f, cy + y * scale * f, z, f];
    };

    let t = 0, running = false, raf = 0;
    function frame() {
      if (!running) return;
      t += 0.0045;
      // ease pointer
      px = lerp(px, tgx, 0.06); py = lerp(py, tgy, 0.06);
      ry += 0.0016 + px * 0.0009;
      rx = lerp(rx, -0.5 + py * 0.5, 0.04);
      const breathe = 1 + Math.sin(t) * 0.018;
      const sY = Math.sin(ry), cY = Math.cos(ry);
      const sX = Math.sin(rx), cX = Math.cos(rx);
      const sc = scale; scale = sc * breathe;

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // particles (depth sorted via simple alpha by z, no array sort needed)
      ctx.globalAlpha = 1;
      for (let i = 0; i < parts.length; i++) {
        const [sx, sy, z, f] = proj(parts[i], sY, cY, sX, cX);
        const depth = clamp((f - 0.78) / 0.5, 0, 1);
        const sz = (1.2 + depth * 4.2);
        ctx.globalAlpha = 0.12 + depth * 0.6;
        ctx.drawImage(SP, sx - sz, sy - sz, sz * 2, sz * 2);
      }

      // wireframe edges
      ctx.globalAlpha = 1;
      const V = geo.v.map(p => proj(p, sY, cY, sX, cX));
      for (const [a, b] of geo.edges) {
        const A = V[a], B = V[b];
        const d = clamp(((A[3] + B[3]) / 2 - 0.78) / 0.5, 0, 1);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.06 + d * 0.5})`;
        ctx.lineWidth = 0.6 + d * 1.1;
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      // vertex nodes
      for (const P of V) {
        const d = clamp((P[3] - 0.78) / 0.5, 0, 1);
        const sz = 3 + d * 6;
        ctx.globalAlpha = 0.4 + d * 0.6;
        ctx.drawImage(SP, P[0] - sz, P[1] - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      scale = sc;
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; frame(); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    addEventListener('resize', () => { resize(); if (RM) drawStatic(); }, { passive: true });

    if (FINE) addEventListener('pointermove', (e) => {
      tgx = (e.clientX / innerWidth - 0.5) * 2;
      tgy = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });

    function drawStatic() { running = true; frame(); running = false; }

    if (RM) { drawStatic(); return; }

    // paint immediately; pause only when hero scrolled out of view or tab hidden
    start();
    const inView = () => {
      const r = canvas.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight;
    };
    let st = false;
    addEventListener('scroll', () => {
      if (st) return; st = true;
      requestAnimationFrame(() => {
        (inView() && !document.hidden) ? start() : stop();
        st = false;
      });
    }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden || !inView()) ? stop() : start());
  }

  /* ---------- depth parallax (rAF-throttled pointer) ---------- */
  function initParallax() {
    if (RM || !FINE) return;
    const nodes = [...document.querySelectorAll('[data-parallax]')].map(el => ({
      el, depth: parseFloat(el.getAttribute('data-parallax')) || 0.04
    }));
    if (!nodes.length) return;
    let tx = 0, ty = 0, cxr = 0, cyr = 0, ticking = false;
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5);
      ty = (e.clientY / innerHeight - 0.5);
      if (!ticking) { ticking = true; requestAnimationFrame(run); }
    }, { passive: true });
    function run() {
      cxr = lerp(cxr, tx, 0.12); cyr = lerp(cyr, ty, 0.12);
      for (const n of nodes) {
        const dx = -cxr * n.depth * 100, dy = -cyr * n.depth * 100;
        n.el.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0)`;
      }
      if (Math.abs(cxr - tx) > 0.001 || Math.abs(cyr - ty) > 0.001) requestAnimationFrame(run);
      else ticking = false;
    }
  }

  /* ---------- cursor spotlight on cards ---------- */
  function initSpotlight() {
    if (!FINE) return;
    const cards = document.querySelectorAll('[data-spotlight]');
    cards.forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---------- 3D tilt ---------- */
  function initTilt() {
    if (RM || !FINE) return;
    document.querySelectorAll('[data-tilt]').forEach(el => {
      const max = parseFloat(el.getAttribute('data-tilt')) || 6;
      let raf = 0, trx = 0, try_ = 0;
      el.style.transformStyle = 'preserve-3d';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        try_ = ((e.clientX - r.left) / r.width - 0.5) * 2 * max;
        trx = -((e.clientY - r.top) / r.height - 0.5) * 2 * max;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => { trx = 0; try_ = 0; if (!raf) raf = requestAnimationFrame(apply); });
      function apply() {
        el.style.transform = `perspective(900px) rotateX(${trx.toFixed(2)}deg) rotateY(${try_.toFixed(2)}deg)`;
        raf = 0;
      }
    });
  }

  /* ---------- magnetic buttons ---------- */
  function initMagnetic() {
    if (RM || !FINE) return;
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const k = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * r.width * k}px,${((e.clientY - r.top) / r.height - 0.5) * r.height * k}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (RM) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(e => {
      const r = e.getBoundingClientRect();
      // anything already in (or above) the first viewport reveals at once
      if (r.top < innerHeight * 0.92) e.classList.add('in');
      else io.observe(e);
    });
  }

  /* ---------- nav state + scroll progress ---------- */
  function initChrome() {
    const nav = document.querySelector('[data-nav], header.nav, nav.nav');
    const bar = document.getElementById('vt-progress');
    let ticking = false;
    const onScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        if (nav) nav.classList.toggle('scrolled', y > 20);
        if (bar) {
          const h = document.documentElement.scrollHeight - innerHeight;
          bar.style.transform = `scaleX(${h > 0 ? clamp(y / h, 0, 1) : 0})`;
        }
        ticking = false;
      });
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- chapter rail: fixed side index tracking scroll position ---------- */
  function initChapterRail() {
    const rail = document.getElementById('chapterRail');
    if (!rail) return;
    const links = Array.from(rail.querySelectorAll('a[data-chapter]'));
    const sections = links
      .map(l => document.getElementById(l.getAttribute('data-chapter')))
      .filter(Boolean);
    if (!sections.length) return;

    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => {
        if (!e.isIntersecting) return;
        const idx = sections.indexOf(e.target);
        if (idx === -1) return;
        links.forEach(l => l.classList.remove('active'));
        links[idx].classList.add('active');
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    sections.forEach(s => io.observe(s));

    const hero = document.querySelector('.hero');
    if (hero) {
      const heroIO = new IntersectionObserver((ents) => {
        ents.forEach(e => rail.classList.toggle('show', !e.isIntersecting));
      }, { threshold: 0.15 });
      heroIO.observe(hero);
    } else {
      rail.classList.add('show');
    }
  }

  function boot() {
    document.querySelectorAll('[data-hero-canvas]').forEach(mountHero);
    initParallax(); initSpotlight(); initTilt(); initMagnetic();
    initReveal(); initChrome(); initChapterRail();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
