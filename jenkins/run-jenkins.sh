#!/usr/bin/env bash
# Spin up a local Jenkins controller pre-loaded with the TerraMind pipeline.
# No setup wizard, no credentials needed — boots straight to a runnable job.
#
#   ./jenkins/run-jenkins.sh         # build image + start (http://localhost:8081)
#   ./jenkins/run-jenkins.sh stop    # stop + remove
#
# NOTE: Colima doesn't forward container ports to the Mac host — run the tunnel
# (scripts/tunnel.sh forwards 8081) then open http://localhost:8081  (admin / admin).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

if [ "${1:-}" = "stop" ]; then
  docker rm -f terramind-jenkins >/dev/null 2>&1 || true
  echo "Jenkins stopped."
  exit 0
fi

echo "== building Jenkins image (terraform + kubeconform + plugins) =="
docker build -t terramind-jenkins "$HERE"

docker rm -f terramind-jenkins >/dev/null 2>&1 || true
docker volume create terramind-jenkins-home >/dev/null 2>&1 || true

echo "== starting Jenkins =="
docker run -d --name terramind-jenkins \
  -p 8081:8080 \
  -v terramind-jenkins-home:/var/jenkins_home \
  -v "$HERE/casc.yaml:/var/jenkins_conf/casc.yaml:ro" \
  terramind-jenkins >/dev/null

echo "Jenkins booting (~30-60s). Tunnel port 8081, then open http://localhost:8081"
echo "Login: admin / admin  →  open job 'terramind-ci' →  Build Now →  watch stages go green."
