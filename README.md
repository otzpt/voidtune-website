# voidtune-website

The VOIDTUNE site. Hand-written static HTML — one self-contained file per
page, CSS and JS inline, no build step and no framework.

```
voidtune/index.html             landing page (served at / on the VOIDTUNE domain)
v-agent/index.html              V-Agent
c-edition/index.html            VOIDTUNE One-Click (C edition)
companion/index.html            mobile companion
assets/                         vt.css, vt.js, detail.js, explorer.js,
                                terminal.js, tweaks.js, latest.js  (shared)
api/latest.js                   serverless: current release from GitHub
icon.png, icon.svg              site icon
google03a73d05a97838af.html     Google Search Console verification
```

## Local

No tooling required — open `index.html` in a browser. For clean URLs matching
production (`/c-edition` rather than `/c-edition.html`):

```bash
python3 -m http.server 8000
```

## Two sites, one repo

| Domain | Serves |
| --- | --- |
| [voidtune-website.vercel.app](https://voidtune-website.vercel.app) | `voidtune/index.html` |
| [v-agent-ide.vercel.app](https://v-agent-ide.vercel.app) | `v-agent/index.html` |

Both Vercel projects deploy this same repo; a host-conditional rewrite in
`vercel.json` decides which page `/` serves. No duplicated assets.

Two things that are easy to get wrong here, both learned the hard way:

- **Rewrites only apply when no file matches the path.** While `index.html`
  sat at the repo root, `/` matched it and the host rule never ran. Moving the
  landing page into `voidtune/` is what makes the rewrites reachable.
- **`cleanUrls` must stay off.** It 308s `/googleXXXX.html` to the extensionless
  path, and Google Search Console checks that exact `.html` URL.

`vercel.json` otherwise ports the old `netlify.toml`: the same cache and
security headers for `/icon.png`, `/assets/*` and HTML.

## Download links

Buttons read the current release from `/api/latest?repo=voidtune|one-click|v-agent`,
which asks the GitHub releases API server-side and caches the answer at the edge
for an hour (`stale-while-revalidate` for a day). Server-side because GitHub
allows 60 unauthenticated requests/hour *per IP*, which one shared office NAT
can exhaust for everybody behind it.

It is progressive enhancement: the HTML ships a real, working link and a real
version, and JavaScript only overwrites them once the API answers. If the API
is down the page still offers a valid, if older, download.

```html
<a data-latest="voidtune">Download</a>                        <!-- href only -->
<a data-latest="voidtune" data-latest-asset="portable">…</a>   <!-- that asset -->
<span data-latest="voidtune" data-latest-tpl="{kind} · {size}">…</span>
```

`/assets/*` is cached for a week, so **bump the `?v=` on the `latest.js` script
tags whenever that file changes** — otherwise returning visitors keep the old
copy.

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

None currently tracked. (`assets/tutorial.js` was previously listed here as a
missing 404 -- it drove the "optimization preview" demo section, which has
since been removed along with the script tag; see repo issues #1-#3 for that
change.)
