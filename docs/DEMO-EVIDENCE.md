# TerraMind — Live Demonstration Evidence

Captured on a single laptop (macOS + Colima) against the **running** system.
This is the presenter's runbook: every line below was produced by a live service, not a mock.
Drop screenshots of the URLs into `docs/screenshots/` to complete deliverable #13.

---

## #1 Working application — LIVE
- Frontend (Next.js): http://localhost:3100 → drone-swarm command center over real Norfolk satellite imagery
- Backend (FastAPI): http://localhost:8000 → `GET /api/command/snapshot` (6 drones, live threats)
- AI service (FastAPI + MiniMax-M3): http://localhost:8001/health → `{"status":"ok"}`
- Live snapshot: **6 drones (4 RAVEN recon + 2 LANCE interceptor), 3 active threats**, real AI flags at the carrier piers.

## #7 Monitoring (Prometheus + Grafana) — LIVE
`monitoring/local-stack/` scrapes the running app every 5s.

```
PROMETHEUS targets:
   prometheus           -> up
   terramind-ai-service -> up
   terramind-backend    -> up

LIVE metrics (queried via Prometheus):
   terramind_active_drones    = 6
   terramind_active_threats   = 3
   terramind_neutralized_total= 3897
   terramind_ai_engine_online = 1

GRAFANA -> Prometheus -> backend datasource health: OK (active_drones = 6)
Dashboard: "TerraMind — Swarm Operations"  /d/efpel278gncowe
```
Show: Grafana `http://localhost:3000` (admin/terramind), Prometheus targets `http://localhost:9090/targets`.

## #9 Secret management (Vault) — LIVE
Real TokenRouter key stored in Vault KV-v2 with a least-privilege read-only policy.

```
$ vault kv get terramind/ai-service
=========== Data ===========
Key                    Value
ai_model               MiniMax-M3
base_url               https://api.tokenrouter.com/v1
tokenrouter_api_key    sk-**********masked**********

$ vault policy list
   default
   terramind-ai      <- path "terramind/data/ai-service" { capabilities = ["read"] }
   root
```
Show: Vault UI `http://localhost:8200/ui` (token `terramind-root`).

## #12 Disaster Recovery — DEMONSTRATED LIVE (`disaster-recovery/dr-demo.sh`)
Simulated the "analytics pipeline failure" the brief calls out. The platform degraded
gracefully and recovered — no crash, no data loss.

```
T0  BASELINE      ai_engine_online = 1    backend=200 ai=200 ui=200
KILL ai-service   ai-service /health = 000 (down)
T1  DEGRADED      ai_engine_online = 0    backend=200  ui=200   <- swarm STILL flying, UI STILL up
RESTART ai-service ai-service /health = 200
T2  RECOVERED     ai_engine_online = 1    (next scan cycle, ~25s)
```
The graceful AI fallback is the resilience story: lose the inference engine, the command
platform keeps operating and self-heals when the engine returns.

## CI/CD — LIVE on GitHub Actions
`.github/workflows/validate.yml` runs on every push. Last 4 runs: **success** (validate job,
~1m40s). Jenkins equivalent is `jenkins/Jenkinsfile` (declarative, portable to a Jenkins server).
Show: https://github.com/AnshumanAtrey/terramind/actions

---

## One-command bring-up
```bash
# app (3 services) is already running on 3100/8000/8001
cd monitoring/local-stack && ./start.sh && ./tunnel.sh &   # Vault + Prometheus + Grafana + port-forward
./disaster-recovery/dr-demo.sh                              # live DR demo
```

## Screenshots still to grab (deliverable #13) — from your own browser
1. `http://localhost:3100` — swarm map, zoom into a carrier pier flag (the money shot)
2. A threat popup showing the AI sensor frame + MiniMax-M3 confidence
3. `http://localhost:3000/d/efpel278gncowe` — Grafana dashboard with live numbers
4. `http://localhost:9090/targets` — Prometheus all-UP
5. `http://localhost:8200/ui` — Vault secret list
6. GitHub Actions green run + a terminal running `dr-demo.sh`
