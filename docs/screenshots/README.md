# Demonstration Screenshots (Deliverable #13)

Captured from the **running** platform (web UIs via headless Chromium / Puppeteer; the
no-UI tools — Terraform, Kubernetes, Jenkins, ELK — rendered from their **green CI run**
output).

| # | Screenshot | Deliverable | What it shows |
|---|---|---|---|
| 01 | `01-command-center.png` | #1 Working App | Command console, AO TRIDENT, 6 RAVEN drones over Norfolk, **AI ONLINE**, threat flagged on map, AI feed with real MiniMax-M3 detections |
| 02 | `02-norfolk-zoom.png` | #1 | Zoomed satellite imagery, drone investigating a pier |
| 03 | `03-threat-detection.png` | #1 | Live threat/intercept state |
| 04 | `04-grafana-dashboard.png` | #7 Monitoring | Grafana — AI Engine ONLINE, neutralized climbing, AI scan rate (minimax-m3), latency p90, threats by priority |
| 05 | `05-prometheus-targets.png` | #7 | Prometheus — all scrape targets UP |
| 06 | `06-prometheus-graph.png` | #7 | Prometheus — live metric graphed |
| 07 | `07-vault-ui.png` | #9 Secrets | Vault UI (authenticated) — the `terramind/` KV-v2 secrets engine |
| 08 | `08-terraform-apply.png` | #5 Terraform | `terraform apply` — namespaces + metrics-server + ingress-nginx, state list |
| 09 | `09-kubernetes-deploy.png` | #6 Kubernetes | `kubectl get pods` all Running + in-cluster smoke test + HPA scale 1→3 |
| 10 | `10-jenkins-pipeline.png` | #4 Jenkins | Jenkins boots, JCasC seeds `terramind-ci`, pipeline tools baked in |
| 11 | `11-elk-logging.png` | #8 Logging | Elasticsearch ingest + query-back of TerraMind logs (centralized logging) |

> Web-UI shots (01–07) are live captures. CLI/no-UI shots (08–11) are rendered from the
> actual output of the green GitHub Actions workflows (`terraform-apply`, `deploy`,
> `jenkins-smoke`, `logging-smoke`) — viewable in full in the Actions tab and the
> `k8s-deploy-evidence` artifact.
