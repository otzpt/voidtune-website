/* ============================================================
   VOIDTUNE — detail popups
   Click any module / process card → modal with the full
   explanation of what it does, what it changes, and revert.
   Matches the site aesthetic. Esc / backdrop / X to close.
   ============================================================ */
(() => {
  'use strict';

  const DATA = {
    m01: {
      kicker: 'Module M01 · Privacy · Network',
      title: 'Telemetry Excision',
      lead: 'Stops Windows from quietly phoning home — without breaking updates or the Store.',
      body: [
        ['What it disables', 'DiagTrack (Connected User Experiences & Telemetry), dmwappushservice, and CompatTelRunner — the three services responsible for the bulk of background data collection.'],
        ['Network level', '34 known Microsoft telemetry endpoints are blocked with outbound Windows Firewall rules, so anything that slips past the service layer still can’t leave the machine.'],
        ['What stays', 'Windows Update, licensing and security signatures are untouched. This is a privacy pass, not a lobotomy.'],
      ],
      revert: 'Fully reversible — the snapshot restores every service state and removes the firewall rules.',
    },
    m02: {
      kicker: 'Module M02 · Performance · Cleanup',
      title: 'Scheduler Surgery',
      lead: 'Removes 60+ junk scheduled tasks that wake your machine up for no reason.',
      body: [
        ['What it strips', 'Customer Experience Improvement Program, Office telemetry, Edge updater tasks, and dozens of “usage data” collectors that run on idle and on logon.'],
        ['Why it helps', 'Fewer background wakeups means lower idle CPU, fewer disk spikes, and less stutter when you alt-tab into a game.'],
        ['What it never touches', 'Windows Update, defrag, restore points and driver maintenance tasks are left exactly as they were.'],
      ],
      revert: 'Each task is exported before removal — one click in the snapshot brings them all back.',
    },
    m03: {
      kicker: 'Module M03 · Gaming · Kernel',
      title: 'Latency Mode',
      lead: 'Kernel-level tuning aimed purely at input responsiveness. Measured 9 ms average gain.',
      body: [
        ['Interrupts', 'Switches your GPU and network card to MSI (Message-Signaled Interrupt) mode and tunes interrupt affinity so input isn’t stuck behind other hardware.'],
        ['Timers', 'Disables HPET and inverts system responsiveness so the foreground app gets priority over background services.'],
        ['Who it’s for', 'Competitive players chasing every millisecond. The gain is real but subtle — this is polish, not a magic FPS button.'],
      ],
      revert: 'All interrupt and timer changes are captured in the snapshot and revert cleanly on rollback.',
    },
    m04: {
      kicker: 'Module M04 · Services',
      title: 'Service Diet',
      lead: 'Audits all 188 stock Windows services and trims the 126 you almost certainly don’t need.',
      body: [
        ['How it decides', 'Every service is scored against a curated profile (desktop, laptop, gaming). Only the safe-to-disable set is touched, each with a full revert manifest.'],
        ['What you get', 'Faster cold boot, lower idle RAM and a cooler-running machine — most noticeable on older or low-spec hardware.'],
        ['Safety', 'Anything load-bearing (networking, audio, GPU, security) stays running. Nothing here will leave you without internet or sound.'],
      ],
      revert: 'Per-service revert manifests mean you can restore one service or all of them instantly.',
    },
    m05: {
      kicker: 'Module M05 · Security · Privacy',
      title: 'Defender Tuning',
      lead: 'Keeps you protected, stops Defender from shipping your files and behaviour to the cloud.',
      body: [
        ['Stays ON', 'Real-time protection, signature updates and on-demand scans remain fully active. Your antivirus keeps working.'],
        ['What it disables', 'Cloud sample submission (MAPS), automatic file uploads, and ASR telemetry leakage — the parts that send data off your machine.'],
        ['The trade-off', 'Slightly less “cloud-assisted” heuristics in exchange for not auto-uploading your files. A deliberate privacy choice.'],
      ],
      revert: 'Snapshot restores every Defender policy value exactly as Windows shipped it.',
    },
    m06: {
      kicker: 'Module M06 · Network',
      title: 'Network Refit',
      lead: 'Modern TCP tuning plus optional encrypted DNS, with zero data sent to VOIDTUNE.',
      body: [
        ['TCP stack', 'Enables autotuning, RSS, RSC and ACK-frequency tuning for higher throughput and lower overhead on modern connections.'],
        ['DNS', 'Optional DNS-over-HTTPS to Cloudflare (1.1.1.1) or Quad9 (9.9.9.9) so lookups are encrypted and private.'],
        ['No exit data', 'Everything is applied locally. VOIDTUNE never proxies, logs or sees a single packet of your traffic.'],
      ],
      revert: 'Original TCP parameters and DNS settings are saved in the snapshot and restored on rollback.',
    },
    s01: {
      kicker: 'Step 01 · Get it',
      title: 'Download',
      lead: 'A self-contained MSI installer, or a portable zip — no .NET or runtime to install. No background service, no telemetry, clean uninstall, built-in auto-update.',
      body: [
        ['Two ways in', 'Run the MSI for a proper install with Start Menu + Desktop shortcuts and a one-click clean uninstall — or grab the portable zip, unzip anywhere, and delete the folder when you are done.'],
        ['Open source', 'Every release is built from the public GPL-3 source on GitHub, so you can read exactly what it does before you run it.'],
      ],
      revert: '',
    },
    s02: {
      kicker: 'Step 02 · Run it',
      title: 'Elevate',
      lead: 'Just launch VOIDTUNE — Windows auto-prompts for UAC and it runs elevated. No manual “run as administrator”.',
      body: [
        ['Why admin', 'Tuning services, the registry and the firewall requires elevation — there’s no way around it for a real optimizer.'],
        ['Auto-elevate', 'The app requests admin in its manifest, so the UAC prompt appears on its own. No telemetry, no account, no network call is made just to open it.'],
      ],
      revert: '',
    },
    s03: {
      kicker: 'Step 03 · Protect yourself',
      title: 'Snapshot',
      lead: 'One click writes a full registry + service-state checkpoint before you change anything.',
      body: [
        ['What it captures', 'The exact state of every service, scheduled task, registry key and network setting VOIDTUNE is capable of touching — saved to a timestamped restore point.'],
        ['Why it matters', 'This is your safety net. Try anything aggressively, and if you don’t like it, roll the entire machine back to this moment in one click.'],
        ['Where it lives', 'Snapshots are stored next to the app in plain files you own — nothing is sent anywhere.'],
      ],
      revert: 'This IS the revert system — every other module restores from the snapshot you take here.',
    },
    s04: {
      kicker: 'Step 04 · Tune it',
      title: 'Apply',
      lead: 'Toggle the modules you want. Every change shows exactly which keys it touches.',
      body: [
        ['Full transparency', 'Before anything is applied, VOIDTUNE shows the precise registry keys, services and tasks each module will modify. No black boxes.'],
        ['Granular control', 'Enable one module or all of them. Change your mind and toggle any single tweak back off without undoing the rest.'],
      ],
      revert: 'Every applied change can be reverted individually, or all at once from your snapshot.',
    },
  };

  // ---- build modal once ----
  const wrap = document.createElement('div');
  wrap.id = 'vt-modal';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <div class="vtm-backdrop" data-close></div>
    <div class="vtm-card" role="dialog" aria-modal="true" aria-labelledby="vtm-title">
      <button class="vtm-x" data-close aria-label="Close">✕</button>
      <div class="vtm-kicker"></div>
      <h3 class="vtm-title" id="vtm-title"></h3>
      <p class="vtm-lead"></p>
      <div class="vtm-body"></div>
      <div class="vtm-revert"></div>
    </div>`;

  const style = document.createElement('style');
  style.textContent = `
  #vt-modal{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:24px;
    opacity:0;pointer-events:none;transition:opacity .3s ease}
  #vt-modal.open{opacity:1;pointer-events:auto}
  #vt-modal .vtm-backdrop{position:absolute;inset:0;background:rgba(4,4,10,.74);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  #vt-modal .vtm-card{position:relative;width:min(560px,100%);max-height:86vh;overflow:auto;border-radius:16px;
    padding:38px 40px 34px;background:linear-gradient(180deg,#15121e,#0c0a12);border:1px solid var(--border-strong,rgba(244,241,234,.16));
    box-shadow:0 50px 120px -40px rgba(0,0,0,.92), 0 0 0 1px color-mix(in oklab,var(--violet,#a78bfa) 10%,transparent);
    transform:translateY(16px) scale(.985);transition:transform .34s cubic-bezier(.2,.7,.2,1);font-family:var(--body,system-ui)}
  #vt-modal.open .vtm-card{transform:none}
  #vt-modal .vtm-x{position:absolute;top:18px;right:18px;width:34px;height:34px;border-radius:9px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid var(--border,rgba(244,241,234,.1));color:var(--muted-foreground,#9a93a8);
    font-size:13px;line-height:1;transition:all .2s}
  #vt-modal .vtm-x:hover{color:var(--foreground,#fff);border-color:var(--violet,#a78bfa)}
  #vt-modal .vtm-kicker{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.26em;text-transform:uppercase;color:var(--violet-glow,#c4b5fd);margin-bottom:16px}
  #vt-modal .vtm-title{font-family:var(--display,serif);font-weight:300;font-size:clamp(1.9rem,4vw,2.7rem);line-height:1.04;color:var(--foreground,#f4f1ea);margin:0 0 14px}
  #vt-modal .vtm-lead{font-size:1.02rem;line-height:1.6;color:var(--foreground,#e9e6df);opacity:.92;margin:0 0 26px;text-wrap:pretty}
  #vt-modal .vtm-body{display:flex;flex-direction:column;gap:20px}
  #vt-modal .vtm-row .h{font-family:var(--mono,monospace);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--violet,#a78bfa);margin-bottom:7px}
  #vt-modal .vtm-row .t{font-size:.94rem;line-height:1.62;color:var(--muted-foreground,#b7b2a8);text-wrap:pretty}
  #vt-modal .vtm-revert{margin-top:26px;padding:16px 18px;border-radius:10px;background:color-mix(in oklab,var(--violet,#a78bfa) 9%,transparent);
    border:1px solid color-mix(in oklab,var(--violet,#a78bfa) 22%,transparent);font-size:.86rem;line-height:1.55;color:var(--violet-glow,#c4b5fd);display:flex;gap:10px}
  #vt-modal .vtm-revert::before{content:"↺";font-size:1rem;flex:none;opacity:.85}
  #vt-modal .vtm-revert:empty{display:none}
  .vt-card{cursor:pointer}
  .vt-card .arr{transition:transform .3s var(--ease,ease)}
  .vt-card:hover .arr{transform:translateX(4px)}
  @media (prefers-reduced-motion:reduce){#vt-modal,#vt-modal .vtm-card{transition:none}}
  `;
  document.head.appendChild(style);
  document.body.appendChild(wrap);

  const card = wrap.querySelector('.vtm-card');
  let lastFocus = null;

  function open(key) {
    const d = DATA[key];
    if (!d) return;
    wrap.querySelector('.vtm-kicker').textContent = d.kicker;
    wrap.querySelector('.vtm-title').textContent = d.title;
    wrap.querySelector('.vtm-lead').textContent = d.lead;
    wrap.querySelector('.vtm-body').innerHTML = d.body.map(([h, t]) =>
      `<div class="vtm-row"><div class="h">${h}</div><div class="t">${t}</div></div>`).join('');
    wrap.querySelector('.vtm-revert').textContent = d.revert || '';
    lastFocus = document.activeElement;
    wrap.classList.add('open');
    wrap.setAttribute('aria-hidden', 'false');
    card.scrollTop = 0;
    wrap.querySelector('.vtm-x').focus();
  }
  function close() {
    wrap.classList.remove('open');
    wrap.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  wrap.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('open')) close(); });

  // wire cards
  function wire() {
    document.querySelectorAll('[data-detail]').forEach(el => {
      el.classList.add('vt-card');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', () => open(el.getAttribute('data-detail')));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.getAttribute('data-detail')); }
      });
    });
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', wire);
  else wire();
})();
