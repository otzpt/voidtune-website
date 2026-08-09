# voidtune-website

The VOIDTUNE site. Hand-written static HTML — one self-contained file per
page, CSS and JS inline, no build step and no framework.

```
index.html                      landing page
v-agent/index.html              V-Agent
c-edition/index.html            VOIDTUNE One-Click (C edition)
companion/index.html            mobile companion
assets/                         vt.css, vt.js, detail.js, explorer.js,
                                terminal.js, tweaks.js  (shared)
icon.png, icon.svg              site icon
google03a73d05a97838af.html     Google Search Console verification
```

## Local

No tooling required — open `index.html` in a browser. For clean URLs matching
production (`/c-edition` rather than `/c-edition.html`):

```bash
python3 -m http.server 8000
```

## Deployment

Vercel, at [voidtune-website.vercel.app](https://voidtune-website.vercel.app).
`vercel.json` is a direct port of the old `netlify.toml`: `trailingSlash`
reproduces its `/v-agent` -> `/v-agent/` redirects, and the same cache and
security headers are set for `/icon.png`, `/assets/*` and HTML.

Pushing to `main` runs `.github/workflows/deploy.yml`: it checks every page
parses and that every local link resolves to a file that exists, then deploys.
The deploy step needs a `VERCEL_TOKEN` repository secret; without it the check
still runs and the deploy skips rather than failing the build.

## History

Previously hosted on Netlify; the old Netlify URL now redirects here.

The site source was not in any repo, and the Netlify deploy had been replaced
by that redirect. The pages, shared assets, icons and the Google verification
file were recovered from local downloads; an earlier, flat, single-file version
of the site also exists in the Wayback Machine's 2026-05-26 snapshot, which is
what confirmed the original URL structure.

An interactive 3D version of this site was built and then reverted — it lives
on the `3d-cinematic` branch (React, three.js, FastAPI backend, C helper that
measures real cache latency). Nothing from it is deployed. To look at it:

```bash
git checkout 3d-cinematic
```

## Known issues

- **`assets/tutorial.js` is missing.** `index.html` loads it with a `<script>`
  tag, so the browser logs a 404 and whatever it powers does not run. Nothing
  else references it by name, so no other JavaScript breaks. Drop the file into
  `assets/` to fix.
