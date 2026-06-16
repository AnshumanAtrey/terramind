# TerraMind — Autonomous Drone Swarm Command & Geospatial Intelligence Platform

> **DevOps Case Study 124** · B.Tech CSE 2024–28 · ITM Skills University
> A defence-focused realization of the TerraMind geospatial-intelligence problem
> statement: a drone swarm command console where an operator defines natural-language
> **watch markers** ("armored convoy in open terrain"), a real **vision AI**
> (MiniMax-M3) scans drone camera frames against them, and confirmed threats trigger
> an autonomous interceptor response — all wrapped in a full DevOps lifecycle.

## Architecture

```
┌──────────────┐     /api/command/snapshot     ┌──────────────┐    /scan     ┌──────────────┐
│  frontend    │ ───── (poll every 2s) ───────▶ │   backend    │ ───────────▶ │  ai-service  │
│  Next.js 14  │                                │  FastAPI     │              │  FastAPI     │
│  :3000       │ ◀──── camelCase JSON ───────── │  swarm sim   │ ◀─ detection │  MiniMax-M3  │
└──────────────┘                                │  + AI loop   │              │  vision      │
   tactical map                                 │  :8000       │              │  :8001       │
   (Esri satellite)                             └──────┬───────┘              └──────────────┘
                                                       │ markers + detections
                                                 ┌─────▼──────┐
                                                 │ PostgreSQL │
                                                 └────────────┘
```

- **frontend/** — Next.js command console: live satellite tactical map (Esri World
  Imagery, no key), watch markers, AI threat feed, telemetry, swarm status, event log.
  Runs on a built-in simulation when no backend is configured (graceful degradation).
- **backend/** — authoritative swarm simulation + AI scan loop. Reads watch markers,
  sends drone frames to the AI service, injects confirmed detections as threats, tasks
  interceptors, persists markers + the detection log, exposes Prometheus `/metrics`.
- **ai-service/** — the vision engine. Sends an overhead frame + the operator's markers
  to **MiniMax-M3** via TokenRouter and returns a structured detection. Deterministic
  mock fallback keeps the platform alive in degraded mode.
- **ai-service/demo-imagery/** — real public-domain satellite/aerial frames of military
  installations (AMARG boneyard, Norfolk carriers, naval ports — see `CREDITS.md`), baked
  into the ai-service image. MiniMax-M3 reads them at 92–98% confidence. Drop any
  `.png/.jpg` here to add your own; the service auto-discovers them.

## The AI loop (validated, real)
`watch markers → MiniMax-M3 vision scan of a frame → detection matched to a marker →
threat injected → confirmed (≥55%) → LANCE interceptor dispatched → neutralized →
persisted to DB + counted in Prometheus`. The vision call is genuinely multimodal —
MiniMax-M3 reads the imagery (verified: it counts vehicles and reads terrain correctly).

## Run it

### Option A — Docker (full stack, one command)
```bash
# put your TokenRouter key in ai-service/.env first (see ai-service/.env.example)
docker compose up --build
# frontend  → http://localhost:3000
# backend   → http://localhost:8000/api/command/snapshot
# ai-service→ http://localhost:8001/info
```

### Option B — native (dev)
```bash
# 1. AI service
cd ai-service && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python seed_frames.py
.venv/bin/uvicorn main:app --port 8001

# 2. Backend (new terminal)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --port 8000

# 3. Frontend (new terminal)
cd frontend && npm install
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev    # http://localhost:3000
```

## Secrets
The TokenRouter / MiniMax-M3 key lives only in `ai-service/.env` (gitignored). In
Kubernetes it is injected by **Vault**, never baked into an image — see the DevOps phase.

## Layout
```
frontend/  backend/  ai-service/   # the application (runs natively + Docker)
kind/  terraform/  kubernetes/      # cluster: config + platform (TF) + app (kubectl)
jenkins/                            # CI/CD pipeline
monitoring/  logging/  vault/       # Prometheus+Grafana · ELK · Vault
disaster-recovery/  docs/           # DR plan · architecture + deployment diagrams
.github/workflows/                  # CI: terraform validate · kubeconform · build
```

## DevOps deliverables — status
| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Working application | ✅ frontend + backend + ai-service (runs, real MiniMax-M3) |
| 2 | Source repo (GitHub) | ✅ pushed |
| 3 | Dockerfiles + images | ✅ all 3 services |
| 4 | Jenkins CI/CD | ✅ `jenkins/Jenkinsfile` (build·scan·push·deploy·smoke) |
| 5 | Terraform | ✅ `terraform/` — `terraform validate` PASS |
| 6 | Kubernetes manifests | ✅ `kubernetes/` — kubeconform 18/18 valid |
| 7 | Prometheus + Grafana | ✅ `/metrics` + scrape config + dashboard JSON |
| 8 | ELK logging | ✅ `logging/` ES + Kibana + Filebeat values |
| 9 | Vault secrets | ✅ `vault/` policy + k8s-auth + agent injection |
| 10 | Architecture diagram | ✅ `docs/architecture.md` (mermaid) |
| 11 | Deployment diagram | ✅ `docs/deployment.md` (mermaid) |
| 12 | Disaster Recovery plan | ✅ `disaster-recovery/DR-PLAN.md` |
| 13 | Demonstration screenshots | ⏳ captured from native app + per-component runs |
| 14 | Project documentation | ✅ this README + per-component READMEs |

> **Validation:** All infra is statically validated (`terraform validate`, `kubeconform`,
> JSON/YAML parse) locally and in CI (`.github/workflows/validate.yml`). The full stack
> is not run all-at-once on the 8 GB dev machine by design — components are brought up
> individually for screenshots (see each component's README).
```
