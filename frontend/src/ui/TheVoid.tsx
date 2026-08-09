import type { VoidtuneInfo } from '../types';

// Links live here as data. Every URL is one the project actually publishes --
// nothing invented, nothing placeholder.
const DISCORD = 'https://discord.gg/vAWqWD2e6R';
const GITHUB = 'https://github.com/otzpt';

const DOWNLOADS = [
  {
    name: 'VOIDTUNE',
    detail: 'Windows 10/11 · WinUI 3 · MSI + portable',
    href: 'https://github.com/otzpt/VOIDTUNE/releases/latest',
    primary: true,
  },
  {
    name: 'VOIDTUNE One-Click',
    detail: 'Native C · ~170 KB · zero dependencies',
    href: 'https://github.com/otzpt/Voidtune-one-click/releases/latest',
    primary: false,
  },
];

const PROJECTS = [
  { name: 'V-Agent', detail: 'Terminal AI agent. Runs local, no cloud.', href: 'https://github.com/otzpt/V-Agent' },
  { name: 'CodeLearner', detail: 'CLI courses, each written in the language it teaches.', href: 'https://github.com/otzpt/CodeLearner' },
  { name: 'VOIDSEED', detail: 'A GPT written from scratch in PyTorch.', href: 'https://github.com/otzpt/VOIDSEED' },
  { name: 'CaffeineOS', detail: 'A WebOS, Hyprland-inspired.', href: 'https://github.com/otzpt/CaffeineOS' },
  { name: 'VOIDSHELL', detail: 'KDE Plasma customization tool.', href: 'https://github.com/otzpt/VOIDSHELL' },
  { name: 'ECHOVOID', detail: 'github.com/otzpt/ECHOVOID', href: 'https://github.com/otzpt/ECHOVOID' },
];

export function TheVoid({ info }: { info: VoidtuneInfo | null }) {
  return (
    <section className="void" id="the-void">
      <div className="void-inner">
        <p className="void-kicker">VOIDTUNE {info?.version ?? ''}</p>
        <h2 className="void-title">Take it back.</h2>
        <p className="void-sub">
          {info?.total_tweaks ?? 177} reversible tweaks. {info?.platform ?? 'Windows 10/11 (x64)'} ·{' '}
          {info?.license ?? 'GPL v3'} · free, open source, no account.
        </p>

        <div className="void-downloads">
          {DOWNLOADS.map((item) => (
            <a
              key={item.name}
              className={`void-dl ${item.primary ? 'primary' : ''}`}
              href={item.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="void-dl-name">{item.name}</span>
              <span className="void-dl-detail">{item.detail}</span>
              <span className="void-dl-go">Download →</span>
            </a>
          ))}
        </div>

        <div className="void-links">
          <a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a>
          <a href={DISCORD} target="_blank" rel="noreferrer">Discord</a>
          <a href="https://github.com/otzpt/VOIDTUNE/issues" target="_blank" rel="noreferrer">Report a bug</a>
          <a href="https://github.com/otzpt/VOIDTUNE/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer">Changelog</a>
        </div>

        <h3 className="void-h3">Other things I build</h3>
        <div className="void-projects">
          {PROJECTS.map((project) => (
            <a key={project.name} href={project.href} target="_blank" rel="noreferrer" className="void-project">
              <b>{project.name}</b>
              <span>{project.detail}</span>
            </a>
          ))}
        </div>

        <footer className="void-footer">
          <span>Built by otzpt · Portugal</span>
          <span>
            This page: React · three.js · FastAPI · C.{' '}
            <a href="https://github.com/otzpt/voidtune-website" target="_blank" rel="noreferrer">
              source
            </a>
          </span>
        </footer>
      </div>
    </section>
  );
}
