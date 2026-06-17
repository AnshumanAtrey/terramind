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

echo "Tunneling Colima VM ports -> localhost (3000 grafana, 9090 prometheus, 8200 vault)"
echo "Open http://localhost:3000  (Grafana: admin / terramind)"
exec ssh -F "$CFG" -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 \
  -L 3000:localhost:3000 \
  -L 9090:localhost:9090 \
  -L 8200:localhost:8200 \
  colima
