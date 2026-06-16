# TerraMind — Frontend (Command Console)

Next.js 14 (App Router) command-and-control dashboard for the **TerraMind Autonomous
Drone Swarm Command & Geospatial Intelligence Platform** (DevOps Case Study 124).

## Stack
- **Next.js 14.2.35** (standalone output, Dockerized) + TypeScript
- **Tailwind CSS** — dark tactical command-center theme
- **react-leaflet + Esri World Imagery** — live satellite tactical map (no API key)
- **@tanstack/react-query** — 2s polling of the command snapshot
- **recharts** — telemetry charts · **lucide-react** — icons

## What it shows
- Live satellite tactical map of **AO SENTINEL** with a moving drone swarm
  (RAVEN recon + LANCE interceptors), patrol rings, AO boundary, and pulsing threat markers
- **Watch Markers** — operator defines natural-language targets ("armored convoy in open
  terrain"); these drive the AI threat matching (the "what to look for" engine)
- **AI Threat Feed** — detections with confidence, grid ref, AI summary, lifecycle
  (detected → confirmed → intercepting → neutralized)
- **Swarm Status**, **Telemetry** (downlink + AI latency), and a streaming **Event Log**

## Data source
The UI runs on a built-in browser **simulation engine** (`src/lib/mockData.ts`) so it is
demoable with zero backend. When `NEXT_PUBLIC_API_URL` is set it talks to the FastAPI
backend instead — and if that backend dies mid-demo it falls back to the simulation and
flips the header to **DEGRADED** (the chaos / disaster-recovery story).

## Run locally
```bash
npm install
npm run dev          # http://localhost:3000  (dev)
# or production:
npm run build && npm run start
```
Set the backend later:
```bash
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
```

## Docker
```bash
docker build -t terramind-frontend .
docker run -p 3000:3000 terramind-frontend
```
