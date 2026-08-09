# voidtune-website

The VOIDTUNE site. Hand-written static HTML — one self-contained file per
page, CSS and JS inline, no build step and no framework.

```
index.html          landing page (features, compare, download, FAQ, roadmap)
c-edition.html      VOIDTUNE C edition
companion.html      mobile companion
v-agent.html        V-Agent
VOIDTUNE_0.8V.zip   download served by the landing page
```

## Local

No tooling required — open `index.html` in a browser. For clean URLs matching
production (`/c-edition` rather than `/c-edition.html`):

```bash
python3 -m http.server 8000
```

## Deployment

Vercel, at [voidtune-website.vercel.app](https://voidtune-website.vercel.app).
`vercel.json` sets `cleanUrls`, so `/c-edition` serves `c-edition.html`.

Pushing to `main` runs `.github/workflows/deploy.yml`: it checks every page
parses and that every local link resolves to a file that exists, then deploys.
The deploy step needs a `VERCEL_TOKEN` repository secret; without it the check
still runs and the deploy skips rather than failing the build.

## History

This site was previously hosted on Netlify. The old Netlify URL now serves a
redirect here.

An interactive 3D version of this site was built and then reverted — it lives
on the `3d-cinematic` branch (React, three.js, FastAPI backend, C helper that
measures real cache latency). Nothing from it is deployed. To look at it:

```bash
git checkout 3d-cinematic
```

## Known issues

- The Discord link in `index.html` is a placeholder (`discord.gg/YOURINVITE`);
  the real invite is `discord.gg/vAWqWD2e6R`.
- `VOIDTUNE_0.8V.zip` is the PowerShell-era 0.8 build recovered with the rest
  of the site. Current releases are on
  [GitHub](https://github.com/otzpt/VOIDTUNE/releases/latest).
