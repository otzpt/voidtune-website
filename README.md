# voidtune-website

Vite + React + TypeScript + [react-three-fiber](https://r3f.docs.pmnd.rs/) for the 3D scene,
Supabase for auth/database, deployed on Vercel.

## Stack

- `src/Scene.tsx` — the 3D content. Read the comments there before adding objects:
  they cover the actual FPS levers (draw calls, instancing, `frameloop="demand"`).
- `src/lib/supabase.ts` — client-side Supabase client (anon key, governed by Row
  Level Security).
- `api/lib/supabaseAdmin.ts` — server-only Supabase client (service role key,
  bypasses RLS) for use inside `/api` functions.
- `api/health.ts` — example serverless function. Deployed automatically by
  Vercel, one file per endpoint, zero config needed.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values below
npm run dev
```

## One-time setup you need to do

**1. Supabase** — create a free project at supabase.com, then from
Project Settings → API, fill in `.env.local`:
- `VITE_SUPABASE_URL` / `SUPABASE_URL` — the Project URL (same value, twice)
- `VITE_SUPABASE_ANON_KEY` — the `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` key (**never** put this
  behind a `VITE_` prefix, that would ship it to every visitor's browser)

**2. Vercel** — log in once (needs your browser):

```bash
npx vercel login
npx vercel link      # links this folder to a new Vercel project
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_URL
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel --prod    # first deploy
```

After that, every push to `main` on GitHub auto-deploys if you connect the
repo in the Vercel dashboard (Project → Settings → Git) instead of deploying
from the CLI each time.

## Commands

- `npm run dev` — local dev server
- `npm run build` — typecheck (`tsc -b`) + production build
- `npm run lint` — oxlint
