# Monitoring — Prometheus + Grafana

The backend and ai-service already expose Prometheus metrics at `/metrics`
(via `prometheus-fastapi-instrumentator` plus custom TerraMind series), and their
pods carry `prometheus.io/scrape` annotations.

## Custom metrics
| Metric | Source | Meaning |
|--------|--------|---------|
| `terramind_active_drones` | backend | drones currently active |
| `terramind_active_threats` | backend | live threats |
| `terramind_neutralized_total` | backend | threats neutralized this session |
| `terramind_frames_analyzed_total` | backend | frames sent to the AI |
| `terramind_ai_engine_online` | backend | 1 = live MiniMax-M3, 0 = degraded |
| `terramind_threats_injected_total{priority}` | backend | confirmed threats |
| `terramind_ai_scans_total{source,detected}` | ai-service | AI analyses |
| `terramind_ai_detections_total{priority}` | ai-service | positive detections |
| `terramind_ai_latency_seconds` | ai-service | inference latency histogram |

## Deploy
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install kps prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/values.yaml

# Grafana (admin / terramind)
kubectl -n monitoring port-forward svc/kps-grafana 3001:80
# → http://localhost:3001  → Dashboards → Import → upload grafana-dashboard.json
```

## Dashboard
`grafana-dashboard.json` — **TerraMind — Swarm Operations**: active drones / threats /
neutralized / AI-engine stat tiles, plus time series for threat count, AI scan rate by
source, p90 inference latency, and threats injected by priority.

> On the 8 GB demo machine, bring monitoring up **after** tearing the app stack down,
> screenshot, then swap — see the root README resource note.
