# TerraMind — Disaster Recovery Plan

Case Study 124 calls out the failures evaluators may simulate: *satellite communication
failures, storage corruption, cyberattacks, cloud-region outages, analytics pipeline
failures, and massive increases in imagery processing workloads.* This plan maps each
to a concrete mitigation already built into the platform.

## Objectives
| Metric | Target | Basis |
|--------|--------|-------|
| **RTO** (recovery time) | ≤ 2 min for any single pod/node loss | K8s self-healing + probes |
| **RPO** (data loss window) | ≤ 5 min | Postgres backup cadence below |
| Availability target | 99.5% (demo SLO) | multi-replica frontend, HA-capable services |

## Failure scenarios → mitigations
| PS failure | What happens | Mitigation in TerraMind |
|------------|--------------|--------------------------|
| **AI / analytics pipeline failure** (MiniMax-M3 or TokenRouter down) | vision calls fail | ai-service returns the **deterministic mock**; backend flips `ai_engine=degraded`; the console shows **DEGRADED** but keeps running. Zero downtime. |
| **Cyberattack / pod compromise** | a pod is killed/restarted | `livenessProbe` + Deployment `replicas` → K8s reschedules automatically (RTO seconds). Network is namespaced; secrets are in Vault, not the image. |
| **Cloud-region / node outage** | a node dies | Deployments reschedule onto a healthy node; frontend runs **2 replicas** so the UI never fully drops. Multi-AZ node groups in a real cluster. |
| **Storage corruption** (Postgres) | DB volume lost | restore from `pg_dump` backup (below); markers + detection log recovered to last backup (RPO ≤ 5 min). Swarm state is ephemeral and self-rebuilds. |
| **Imagery processing surge** | AI load spikes | **HPA** on the stateless ai-service scales 1→5 replicas on CPU; backend scan loop is throttled. Verified design (see `kubernetes/20-ai-service.yaml`). |
| **Satellite comms failure** (drone feed loss) | frames stop arriving | scan loop simply finds no new contacts; existing threats complete their lifecycle; system stays nominal and recovers when feeds resume. |

## Backup & restore
**Kubernetes resources** — Velero to object storage:
```bash
velero install --provider aws --bucket terramind-backups ...   # or MinIO locally
velero schedule create terramind-daily --schedule="0 */6 * * *" --include-namespaces terramind
velero restore create --from-backup terramind-daily-<ts>
```
**PostgreSQL** — logical dumps every 5 min (CronJob), restore on demand:
```bash
# backup
kubectl -n terramind exec deploy/postgres -- pg_dump -U terramind terramind > backup.sql
# restore
kubectl -n terramind exec -i deploy/postgres -- psql -U terramind terramind < backup.sql
```

## Recovery runbook (single-pod loss — the common case)
1. `kubectl -n terramind get pods` — identify the failed pod.
2. K8s has already rescheduled it (no action needed); confirm `READY`.
3. `kubectl -n terramind rollout status deploy/<name>` — confirm rollout healthy.
4. Hit `GET /api/command/snapshot` — `status.aiEngine` should return to `online`.
5. If the AI stayed `degraded`, check the ai-service logs and the Vault injection
   (`vault/README.md` → Verify the injection).

## Drill (what to demo)
- `kubectl -n terramind delete pod -l app=ai-service` → watch it reschedule, console
  briefly shows **DEGRADED**, then recovers to **ONLINE**.
- `kubectl -n terramind scale deploy/ai-service --replicas=1` then drive load → watch
  the **HPA** add replicas in `kubectl get hpa -w`.
