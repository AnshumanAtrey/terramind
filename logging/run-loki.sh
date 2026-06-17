#!/usr/bin/env bash
# Loki + Promtail — the LIGHT logging alternative (~200 MB) wired into the Grafana
# you already run for metrics. Bonus: one Grafana for both metrics AND logs.
# NOT a replacement for the ELK deliverable — show this as "what we'd run in prod".
#   ./logging/run-loki.sh         # start
#   ./logging/run-loki.sh stop
set -euo pipefail
NET=terramind-mon   # reuse the monitoring network so the existing Grafana reaches Loki

if [ "${1:-}" = "stop" ]; then
  docker rm -f terramind-loki terramind-promtail >/dev/null 2>&1 || true
  echo "Loki stopped."; exit 0
fi

docker network create "$NET" >/dev/null 2>&1 || true

echo "== Loki =="
docker rm -f terramind-loki >/dev/null 2>&1 || true
docker run -d --name terramind-loki --network "$NET" --network-alias loki \
  -p 3101:3100 grafana/loki:3.1.0 >/dev/null

echo "== Promtail (Docker logs -> Loki) =="
TMP=$(mktemp -d)
cat > "$TMP/promtail.yml" <<'YML'
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: docker
    static_configs:
      - targets: [localhost]
        labels:
          job: terramind
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - docker: {}
YML
docker rm -f terramind-promtail >/dev/null 2>&1 || true
docker run -d --name terramind-promtail --network "$NET" \
  -v "$TMP/promtail.yml:/etc/promtail/config.yml:ro" \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  grafana/promtail:3.1.0 -config.file=/etc/promtail/config.yml >/dev/null

echo "Loki up. In Grafana (http://localhost:3000) -> Connections -> Add data source -> Loki"
echo "  URL: http://loki:3100   (same docker network as Grafana)"
echo "Then Explore -> Loki -> query  {job=\"terramind\"}  for live container logs."
