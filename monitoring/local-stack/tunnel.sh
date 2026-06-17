#!/usr/bin/env bash
# Colima doesn't forward published container ports to the macOS host by default
# (its VM has no reachable IP: network.address=false). This opens an SSH tunnel
# into the Colima VM so you can reach the dashboards from your Mac browser:
#   Grafana    -> http://localhost:3000
#   Prometheus -> http://localhost:9090
#   Vault UI   -> http://localhost:8200
#
# Usage:  ./tunnel.sh         (foreground; Ctrl-C to stop)
#         ./tunnel.sh &       (background)
set -euo pipefail

CFG=/tmp/colima-ssh-config
colima ssh-config > "$CFG" 2>/dev/null || { echo "colima not running? run: colima start"; exit 1; }

echo "Tunneling Colima VM ports -> localhost:"
echo "  3000 grafana · 9090 prometheus · 8200 vault · 8081 jenkins · 5601 kibana · 3101 loki"
echo "Open http://localhost:3000  (Grafana: admin / terramind)"
# -L for ports not yet serving is harmless; they connect once the service is up.
exec ssh -F "$CFG" -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 \
  -L 3000:localhost:3000 \
  -L 9090:localhost:9090 \
  -L 8200:localhost:8200 \
  -L 8081:localhost:8081 \
  -L 5601:localhost:5601 \
  -L 3101:localhost:3101 \
  colima
