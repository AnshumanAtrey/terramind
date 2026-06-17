# Local LIVE monitoring + secrets stack

Turns deliverables **#7 (Prometheus + Grafana)** and **#9 (Vault)** from config files into
running services scraping the **live** TerraMind app — on a laptop, no Kubernetes required.

## What it does
- **Prometheus** (`:9090`) scrapes the live backend (`:8000`) and AI service (`:8001`) `/metrics` every 5s.
- **Grafana** (`:3000`) auto-provisions a Prometheus datasource + the `TerraMind — Swarm Operations`
  dashboard (same JSON as the K8s deliverable), showing real drone/threat metrics moving.
- **Vault** (`:8200`, dev mode) stores the real TokenRouter API key under `terramind/ai-service`
  with a least-privilege read-only policy.

## Run it
```bash
./start.sh          # boots Vault + Prometheus + Grafana, wires them to the live app
./tunnel.sh &       # Colima port-forward (see note below)
```
Open:
| URL | What to show | Login |
|-----|--------------|-------|
| http://localhost:3000/d/efpel278gncowe | Grafana — live swarm dashboard | admin / terramind (or anonymous) |
| http://localhost:9090/targets | Prometheus — all targets `UP` | — |
| http://localhost:8200/ui | Vault — secret at `terramind/ai-service` | token `terramind-root` |

## Why the tunnel?
This machine runs Docker via **Colima**, whose VM has no host-reachable IP
(`network.address=false`), so published container ports (`3000/9090/8200`) are **not** auto-forwarded
to macOS `localhost`. `tunnel.sh` opens an SSH tunnel into the Colima VM to bridge them. The native
app ports (`3100/8000/8001`) are host processes and need no tunnel. In real Kubernetes this is a
non-issue — see `kubernetes/` + `monitoring/values.yaml` (kube-prometheus-stack) for the cluster path.

## Stop / clean
```bash
docker rm -f terramind-vault terramind-prometheus terramind-grafana
docker network rm terramind-mon
```
