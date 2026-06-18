# Security & Resilience — TerraMind (Case Study 124)

Security controls and resilience measures, mapped to the threats and failure
scenarios Case Study 124 calls out (*"cyberattacks … security controls … reviewers
may simulate satellite communication failures, storage corruption, cloud-region
outages, analytics pipeline failures, and massive imagery workloads"*).

## 1. Secret management (no secrets in code or images)
- **HashiCorp Vault** is the source of truth for secrets (`vault/`). The TokenRouter
  API key lives in **KV-v2** at `terramind/ai-service`; nothing sensitive is committed
  or baked into an image. *(Demonstrated live: stored + retrieved through the engine.)*
- **Least privilege**: `vault/terramind-policy.hcl` grants **read-only** on only the
  one path a workload needs — no wildcard, no write, no list elsewhere.
- **Kubernetes auth + Agent injection**: pods authenticate to Vault as a bound
  ServiceAccount (`vault/setup-vault.sh`); the Vault Agent sidecar renders the secret
  to an in-memory file (`vault/ai-service-injected.yaml`) — it never touches the
  manifest, image, or any other pod's environment.
- **Git hygiene**: `.gitignore` blocks `.env`, `*.local`, `*.db`, tfstate; only
  `.env.example` templates are committed.

## 2. Workload hardening
- **Non-root containers**: `USER app` (backend, ai-service), `USER nextjs` uid 1001
  (frontend). No container runs as root.
- **Minimal base images**: `python:3.12-slim`, `node:20-alpine` — small attack surface.
- **Multi-stage frontend build**: build tooling discarded; only the standalone runtime ships.
- **Resource limits** (CPU/memory requests + limits) on every Deployment bound blast
  radius and prevent resource-exhaustion DoS.
- **Health probes** (readiness + liveness) on all services → unhealthy pods are pulled
  from rotation and auto-restarted.

## 3. Supply-chain security (CI/CD)
- **Trivy image scan** stage in `jenkins/Jenkinsfile` flags HIGH/CRITICAL CVEs in all
  three images before push.
- **Pinned base images + locked deps** (exact Dockerfile tags, pinned `requirements.txt` /
  `package-lock.json`, committed `.terraform.lock.hcl`) → reproducible, auditable builds.
- **Static-analysis gate** in CI (`terraform validate`, `kubeconform -strict`, `ruff`)
  blocks malformed/drifted infra.
- **Scoped registry auth**: images publish to GHCR using the per-run `GITHUB_TOKEN`
  with `packages: write` only — no long-lived registry credential.

## 4. Network & access surface
- **Single ingress entrypoint** (`kubernetes/50-ingress.yaml`): only the frontend (`/`)
  and backend API (`/api`) are exposed; **Postgres and the ai-service are ClusterIP-only**,
  unreachable from outside the cluster.
- **Namespace isolation**: workloads in `terramind`; platform services in separate
  `monitoring` / `logging` / `vault` namespaces (Terraform-managed).
- **CORS** configurable per environment (`CORS_ORIGINS`); `*` is local-demo only.

## 5. Resilience — the failure scenarios reviewers may simulate
| PS124 scenario | How TerraMind handles it | Proof |
|---|---|---|
| **Analytics pipeline failure** | AI service dies → backend marks `ai_engine_online=0`, swarm + UI keep running on graceful fallback → auto-recovers | **live demo** `disaster-recovery/dr-demo.sh` |
| **Massive imagery workload surge** | HPA scales `ai-service` 1→5 on CPU; stateless scan workload | **proven** scaled 1→3 in `deploy.yml` |
| **Satellite / comm failure** | Same degradation path — unreachable sensor/AI feed → mock fallback, no crash | dr-demo (same mechanism) |
| **Storage corruption** | Postgres on a PVC; schema re-created on startup (`Base.metadata.create_all`); detection log is append-only; K8s reschedules the pod | `kubernetes/10-postgres.yaml` |
| **Cloud-region / node outage** | Liveness/readiness probes restart + reschedule pods; frontend `replicas: 2`; rolling updates | k8s manifests |
| **Cyberattack / credential theft** | Vault least-privilege + Agent injection; no secrets in images; Trivy scan; non-root; ClusterIP isolation; scoped CI token | §1–4 above |

## 6. Hardening backlog (production, beyond this coursework)
Honest list of what a real deployment adds on top of the 8 GB demo build:
NetworkPolicies (default-deny east-west), Vault HA with auto-unseal + non-root token,
TLS on ingress + mTLS between services, image signing (cosign) + admission policy,
Pod Security Standards (`restricted`), and externalised audit-log shipping.
