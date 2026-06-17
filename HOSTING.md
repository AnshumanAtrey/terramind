# Hosting TerraMind

A clear split, because the platform choice depends on what each piece *is*.

| Piece | What it is | Host it on | Not on |
|-------|-----------|-----------|--------|
| **Next.js frontend** | Client-rendered SPA (no SSR data fetch, no API routes) | **Vercel** (ideal) / Netlify | — |
| **FastAPI backend** | Stateful, always-on server (1s sim loops, in-memory swarm state) | Render / Fly.io / Railway (container) | ❌ Vercel / Netlify |
| **AI service** | Same — long-running uvicorn process | Render / Fly.io / Railway (container) | ❌ Vercel / Netlify |

**Why the backend can't go on Vercel/Netlify:** they're *serverless* — code runs per-request and is frozen/killed between requests. The backend ticks the swarm every second via background `asyncio` loops and holds all drone/threat state in an in-memory singleton. On serverless the loops never run, the state resets on every cold start, and `while True` would hit the 10–60s execution cap. It needs a persistent process.

---

## Path A — Frontend on Vercel (recommended: free, always-on, clickable)

The frontend ships a **fully self-contained in-browser simulation** when `NEXT_PUBLIC_API_URL` is empty
(`src/lib/api.ts:11` → if no API, return `simEngine.snapshot()`; the `SwarmSimulation` singleton in
`src/lib/mockData.ts` advances drones/threats on react-query's 2s poll). Since `.env.local` is gitignored,
**a fresh cloud build defaults to sim mode** — drones fly, threats spawn and get neutralized, telemetry
updates, all client-side, zero backend. Verified: `next build` with no env var builds clean (leaflet is
already guarded behind a `dynamic(..., { ssr: false })` import).

### Dashboard (easiest)
1. Vercel → **Add New → Project** → import `AnshumanAtrey/terramind`.
2. Framework Preset: **Next.js** (auto-detected).
3. **Root Directory → `frontend`** (this is the critical setting — the app lives in a subdir).
4. **Leave `NEXT_PUBLIC_API_URL` unset** → sim mode. Click **Deploy**.

### CLI
```bash
npm i -g vercel
cd frontend          # run from inside frontend/ so it becomes the project root
vercel               # link/create project, accept detected Next.js settings
vercel --prod        # ship to production
```
No `vercel.json` needed — with Root Directory set, Vercel fully auto-detects the app. `output: 'standalone'`
in `next.config.mjs` is harmless (Vercel ignores it and uses its own adapter — one config serves Docker,
Vercel, and Netlify with no edits).

### Netlify equivalent
Import repo → **Base directory = `frontend`**, build `npm run build`, leave `NEXT_PUBLIC_API_URL` unset.
`@netlify/plugin-nextjs` is auto-applied.

---

## Path B — Real backend publicly reachable (optional, container host)

Only if you want the **real MiniMax-M3 AI** reachable from the public URL (not just the sim). Deploy the two
Dockerfiles as **always-on web services**, then rebuild the Vercel frontend with `NEXT_PUBLIC_API_URL` set to
the backend's public URL (it's build-time inlined, so a redeploy is required to switch modes).

| Host | Fit | The catch |
|------|-----|-----------|
| **Fly.io** | Best for always-on — set `min_machines_running = 1` so it never idles | Needs a card; very cheap, not strictly $0; explicit port in `fly.toml` |
| **Render** | Native fit, free tier, managed free Postgres | **Spins down after ~15 min idle** → the sim freezes & resets on wake. Ping `/health` to keep warm, or paid Starter (~$7/mo) |
| **Railway** | Cleanest config, auto-injects Postgres `DATABASE_URL` | No permanent free tier (~$5/mo usage-based) |

For all three: switch `DATABASE_URL` off SQLite onto managed **Postgres**, set `TOKENROUTER_API_KEY` as a
secret/env var, point the backend's `AI_SERVICE_URL` at the ai-service's private internal address.

> **The catch that matters for a defence-swarm demo:** every free tier idles to zero, which *freezes the
> simulation* (the whole point is that it ticks 24/7). Fly.io with `min_machines_running=1` is the only
> truly always-on free-ish option. For a live viva, running the real backend locally is simpler and snappier.

---

## Recommendation
**Vercel frontend in sim mode** = a free, always-on, shareable link for "click around the product."
**Real AI + K8s + monitoring + Vault** stay the live local / CI demo (that's where the actual DevOps story is).
You get a public URL *and* the real engineering proof, without paying for or babysitting a backend host.
