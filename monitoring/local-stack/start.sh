#!/usr/bin/env bash
# One command to bring up the LIVE monitoring + secrets demo stack on top of the
# already-running app (frontend :3100, backend :8000, ai-service :8001).
#
#   ./start.sh        # starts Vault + Prometheus + Grafana, wires them to the live app
#
# Then run ./tunnel.sh (Colima port-forward) and open:
#   Grafana    http://localhost:3000   (admin / terramind)  -> TerraMind — Swarm Operations
#   Prometheus http://localhost:9090   -> Status > Targets (all UP)
#   Vault UI   http://localhost:8200   (token: terramind-root)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

echo "== Vault (dev) =="
docker rm -f terramind-vault >/dev/null 2>&1 || true
docker run -d --name terramind-vault --cap-add=IPC_LOCK \
  -e VAULT_DEV_ROOT_TOKEN_ID=terramind-root \
  -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
  -p 8200:8200 hashicorp/vault:1.17 >/dev/null
# wait for vault, then seed the real secret from ai-service/.env
until docker exec -e VAULT_ADDR=http://127.0.0.1:8200 terramind-vault vault status >/dev/null 2>&1; do sleep 1; done
KEY=$(grep -E '^TOKENROUTER_API_KEY=' ../../ai-service/.env | cut -d= -f2-)
MODEL=$(grep -E '^AI_MODEL=' ../../ai-service/.env | cut -d= -f2-)
docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=terramind-root terramind-vault \
  vault secrets enable -path=terramind kv-v2 >/dev/null 2>&1 || true
docker exec -e VAULT_ADDR=http://127.0.0.1:8200 -e VAULT_TOKEN=terramind-root terramind-vault \
  vault kv put terramind/ai-service tokenrouter_api_key="$KEY" ai_model="$MODEL" \
  base_url="https://api.tokenrouter.com/v1" >/dev/null
echo "   secret stored at terramind/ai-service"

echo "== Prometheus + Grafana =="
docker rm -f terramind-prometheus terramind-grafana >/dev/null 2>&1 || true
docker network create terramind-mon >/dev/null 2>&1 || true
docker run -d --name terramind-prometheus --network terramind-mon --network-alias prometheus \
  --add-host host.docker.internal:host-gateway -p 9090:9090 \
  -v "$HERE/prometheus.yml:/etc/prometheus/prometheus.yml:ro" \
  prom/prometheus:v2.54.1 >/dev/null
docker run -d --name terramind-grafana --network terramind-mon \
  --add-host host.docker.internal:host-gateway -p 3000:3000 \
  -e GF_SECURITY_ADMIN_USER=admin -e GF_SECURITY_ADMIN_PASSWORD=terramind \
  -e GF_AUTH_ANONYMOUS_ENABLED=true -e GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer \
  -e GF_USERS_DEFAULT_THEME=dark \
  -v "$HERE/grafana/provisioning:/etc/grafana/provisioning:ro" \
  -v "$HERE/grafana/dashboards:/var/lib/grafana/dashboards:ro" \
  grafana/grafana:11.2.0 >/dev/null

echo "== up =="
docker ps --filter name=terramind- --format '  {{.Names}}  {{.Status}}'
echo "Next: ./tunnel.sh   then open http://localhost:3000"
