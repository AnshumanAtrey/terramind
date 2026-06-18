# Compliance Report — TerraMind (Case Study 124)

Addresses the brief's requirement that *"stakeholders require strict availability
targets, operational continuity, and rapid recovery capabilities."* This report maps
those obligations to concrete, verifiable controls in the platform.

## 1. Data integrity & auditability
| Requirement | Control | Evidence |
|---|---|---|
| Durable record of every AI detection | Each flagged threat is written to the **Postgres detection log** (`backend/db_models.py`) | `backend/main.py:persist_detection()` runs in the scan loop |
| Tamper-evident provenance | Every row carries grid reference, confidence, `detected_by` (which drone), `source`, and timestamp — the full provenance of a detection | detections table schema |
| Result classification | Detections record whether the verdict came from the live model (`source="minimax-m3"`) or the **fallback** (`source="mock"` / degraded) — so un-analyzed results are never silently trusted | `backend/main.py:scan_target()`, `AI_ONLINE` gauge |
| No data loss on AI/node failure | Detections are persisted at creation; a dying AI engine degrades gracefully without losing the swarm or the log | proven via `dr-demo.sh` |

## 2. Operational continuity (SLO posture)
| Objective | Target | How it's met |
|---|---|---|
| Command-plane availability | survives single node loss | K8s reschedules the backend onto a healthy node; probes gate readiness |
| AI engine RTO | < 30 s | stateless service, fast restart; **graceful degradation** keeps the swarm operating during the outage (recovered in ~25 s live) |
| Detection-log RPO | ≈ 0 | detections persisted to PVC-backed Postgres at the moment of creation |
| Self-healing | automatic | K8s liveness/readiness probes restart unhealthy pods; HPA scales the ai-service on load |

## 3. Change management & traceability
- **Infrastructure as Code**: the platform is reproducible from Git (`terraform/`,
  `kubernetes/`) — no undocumented manual state.
- **Pinned, locked dependencies**: `.terraform.lock.hcl`, pinned image tags,
  `requirements.txt`, `package-lock.json` → reproducible, auditable builds.
- **CI gates on every change**: 5 GitHub Actions workflows (`validate`, `deploy`,
  `terraform-apply`, `jenkins-smoke`, `logging-smoke`) run on push, with a downloadable
  **evidence artifact** (`k8s-deploy-evidence`) per deploy run.
- **Versioned history**: all changes tracked in Git; CI run history is the change log.

## 4. Security controls (summary — full detail in `SECURITY.md`)
- Secrets in **Vault** (KV-v2) with **least-privilege** read-only policy; none in code or images.
- **Non-root** containers, resource limits, minimal base images.
- **Trivy** vulnerability scanning in the Jenkins pipeline (HIGH/CRITICAL).
- **Network isolation**: ai-service + Postgres ClusterIP-only; single audited ingress.

## 5. Disaster recovery readiness (summary — full plan in `disaster-recovery/DR-PLAN.md`)
Every failure class PS124 names has a response: analytics-pipeline failure (graceful
degradation, live `dr-demo.sh`), imagery-workload surge (HPA, proven 1→3), satellite/comm
failure (same degradation path), storage corruption (PVC + schema re-create + reschedule),
and cloud-region/node outage (probes + reschedule + multi-replica frontend). Mapped in
`SECURITY.md §5`.

## 6. Attestation
| Control area | Status | Verification method |
|---|---|---|
| Data integrity (detection log) | ✅ implemented | Postgres detections table, persisted on flag |
| Operational continuity | ✅ demonstrated | live AI outage → auto-recovery (`ai_engine_online` 0→1) |
| Security controls | ✅ implemented | Vault policy, non-root, Trivy, network isolation |
| Disaster recovery | ✅ demonstrated | `dr-demo.sh`, HPA scaling, K8s self-healing |
| Change traceability | ✅ implemented | IaC + locked deps + CI gates + evidence artifacts |

> Scope note: this is a coursework demonstration of the *controls and their
> verification*, not a formal third-party audit. Production hardening items are listed
> honestly in `SECURITY.md §6`.
