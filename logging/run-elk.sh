#!/usr/bin/env bash
# ELK stack (deliverable #8) — Elasticsearch + Kibana + Filebeat, memory-capped.
# Filebeat ships logs from your running Docker containers into Elasticsearch; you
# view + search them in Kibana. This is the HEAVY one (~2-2.5 GB) — give Colima room:
#   colima stop && colima start --cpu 4 --memory 6      (then restart your app/monitoring)
# Colima doesn't forward ports to the Mac host — tunnel 5601 and open Kibana there.
#
#   ./logging/run-elk.sh         # start
#   ./logging/run-elk.sh stop    # stop + remove
set -euo pipefail
NET=terramind-elk
ES=docker.elastic.co/elasticsearch/elasticsearch:8.15.0
KB=docker.elastic.co/kibana/kibana:8.15.0
FB=docker.elastic.co/beats/filebeat:8.15.0

if [ "${1:-}" = "stop" ]; then
  docker rm -f terramind-es terramind-kibana terramind-filebeat >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  echo "ELK stopped."; exit 0
fi

docker network create "$NET" >/dev/null 2>&1 || true

echo "== Elasticsearch (single-node, security off, 512m heap) =="
docker rm -f terramind-es >/dev/null 2>&1 || true
docker run -d --name terramind-es --network "$NET" \
  -e "discovery.type=single-node" -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  -p 9200:9200 "$ES" >/dev/null

echo "== Kibana =="
docker rm -f terramind-kibana >/dev/null 2>&1 || true
docker run -d --name terramind-kibana --network "$NET" \
  -e "ELASTICSEARCH_HOSTS=http://terramind-es:9200" \
  -p 5601:5601 "$KB" >/dev/null

echo "== Filebeat (ships Docker container logs -> Elasticsearch) =="
TMP=$(mktemp -d)
cat > "$TMP/filebeat.yml" <<'YML'
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
output.elasticsearch:
  hosts: ["http://terramind-es:9200"]
  index: "terramind-logs-%{+yyyy.MM.dd}"
setup.template.name: "terramind-logs"
setup.template.pattern: "terramind-logs-*"
setup.ilm.enabled: false
YML
docker rm -f terramind-filebeat >/dev/null 2>&1 || true
docker run -d --name terramind-filebeat --network "$NET" --user root \
  -v "$TMP/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro" \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  "$FB" filebeat -e --strict.perms=false >/dev/null

echo "Wait ~60-90s for ES + Kibana to come up. Tunnel 5601, then open http://localhost:5601"
echo "Kibana: Stack Management -> Data Views -> create 'terramind-logs-*' -> Discover to search logs."
