# Comprehensive Architecture Report — TerraMind (Case Study 124)

> *"…architecture documentation demonstrating resilience and operational excellence"*
> for a cloud-native geospatial-intelligence DevOps ecosystem.

Consolidated report. References the diagrams in [`architecture.md`](./architecture.md)
(component view) and [`deployment.md`](./deployment.md) (deployment view), and the
deep-dives in [`SECURITY.md`](./SECURITY.md), [`COMPLIANCE.md`](./COMPLIANCE.md), and
[`../disaster-recovery/DR-PLAN.md`](../disaster-recovery/DR-PLAN.md).

## 1. System overview
TerraMind is a cloud-native command plane for an autonomous drone-surveillance and
geospatial-intelligence estate. Operators set natural-language **watch markers**; recon
drones sweep an area of operations (Naval Station Norfolk); an AI vision engine scans
the imagery each drone returns; threats are flagged on real coordinates and interceptors
are vectored in. Three services + a datastore:

- **frontend** (Next.js 14) — tactical command console over live satellite imagery;
  runs a standalone in-browser **simulation** if the backend is absent (graceful degradation).
- **backend** (FastAPI) — authoritative swarm state, sweep/scan loop, threat lifecycle,
  Prometheus metrics, and detection-log persistence.
- **ai-service** (FastAPI) — **MiniMax-M3** multimodal vision; independently scalable;
  deterministic mock fallback when the model is unreachable.
- **PostgreSQL** — durable, auditable detection log.

## 2. Scalability
- **Horizontal scaling where it belongs**: the ai-service is stateless and carries a
  **HorizontalPodAutoscaler** (CPU-driven, `minReplicas 1 → maxReplicas 5`). An imagery
  surge drives more scans → CPU rises → replicas grow. **Proven live in CI**: scaled
  1→3, all pods `Running` (`k8s-deploy-evidence`).
- **Singleton coordinator by design**: the backend holds authoritative in-memory swarm
  state, so it is intentionally `replicas: 1` rather than incorrectly autoscaled — the
  correct pattern for a stateful coordinator.
- **Stateless edge**: the frontend runs `replicas: 2` behind the ingress.
- metrics-server (Terraform-provisioned) supplies the CPU metrics the HPA needs.

## 3. Resilience
- **Self-healing**: liveness/readiness probes on every service → K8s restarts unhealthy
  pods and keeps them out of rotation until ready.
- **Graceful degradation**: if the AI engine dies, the swarm keeps sweeping and the UI
  stays up (detections stamped degraded, `ai_engine_online → 0`); on restart it recovers
  (`→ 1`) in ~25 s. The platform is never fully down — proven live (`dr-demo.sh`).
- **Failed-release safety**: K8s rollouts are health-gated → a bad image auto-rolls-back
  to the last good ReplicaSet.
- **Durable record**: threats persist to a PVC-backed Postgres detection log; storage
  corruption → schema re-create on startup + pod reschedule.
- **Reproducible from code**: `terraform apply` + `kubectl apply` rebuild the platform.

## 4. Security
(Full detail in `SECURITY.md`.) Vault-managed secrets with least-privilege read-only
policy and Agent injection — nothing in code or images; non-root containers with resource
limits; Trivy CVE scanning in CI; ai-service + Postgres ClusterIP-only behind a single
audited ingress; secret-free Git.

## 5. Observability
- **Three signals**: Prometheus **metrics** (custom domain gauges + RED via the
  instrumentator), structured **logs** to ELK / Loki, and a live **Grafana** dashboard.
- **Domain-meaningful metrics**: `terramind_active_drones`, `terramind_active_threats`,
  `terramind_neutralized_total`, `terramind_frames_analyzed_total`,
  `terramind_ai_engine_online`, `terramind_threats_injected_total{priority}`.
- **Proven live**: all Prometheus targets UP, Grafana rendering real data, ELK ingesting
  + querying logs (`logging-smoke`). The `ai_engine_online` gauge doubles as the DR
  health signal.

## 6. Operational excellence
- **One-command everything**: `docker compose up` (full stack),
  `./terraform/run-local.sh` (infra), `./monitoring/local-stack/start.sh` (observability
  + Vault), `./logging/run-elk.sh` (logging), `./jenkins/run-jenkins.sh` (CI),
  `./disaster-recovery/dr-demo.sh` (chaos), `./monitoring/local-stack/tunnel.sh`.
- **Full CI/CD**: 5 GitHub Actions workflows (validate · deploy-to-real-kind ·
  terraform-apply · jenkins-smoke · logging-smoke), all green, plus a Jenkins pipeline
  (build · Trivy scan · push · deploy · smoke); every deploy uploads evidence.
- **Everything as code + documented**: IaC, per-component READMEs, architecture +
  deployment diagrams, DR plan, security + compliance reports.

## 7. Quality scorecard
| Quality | How it's demonstrated | Status |
|---|---|---|
| Scalability | HPA 1→3 proven; singleton/stateless split; metrics-driven | ✅ |
| Resilience | self-healing probes; graceful degradation; rollback | ✅ |
| Security | Vault least-privilege + injection; non-root; Trivy; isolation | ✅ |
| Observability | Prometheus + Grafana live; ELK proven; 3 signals | ✅ |
| Operational excellence | one-command ops; 5 green workflows; full docs | ✅ |

## 8. Honest limitations
Single-node kind cluster for the demo; the swarm "estate" is a faithful simulation (not
real drone hardware); Elasticsearch runs on the amd64 CI runner rather than the arm64
8 GB box (it won't boot there); production hardening (NetworkPolicies, Vault HA, mTLS,
image signing) is enumerated in `SECURITY.md §6` but out of coursework scope. These are
deliberate, stated trade-offs — the *patterns and their verification* are the point.
