#!/usr/bin/env bash
# LIVE Disaster Recovery demo — "reviewers may simulate analytics pipeline failures".
# Kills the AI inference service, shows the platform DEGRADE GRACEFULLY (swarm keeps
# flying, UI stays up, gauge terramind_ai_engine_online -> 0), then restarts it and
# shows RECOVERY (gauge -> 1). Run this live during the viva.
#
#   ./dr-demo.sh
set -uo pipefail
AI_DIR="$(cd "$(dirname "$0")/../ai-service" && pwd)"

gauge(){ curl -s --max-time 4 http://localhost:8000/metrics 2>/dev/null \
  | awk '/^terramind_ai_engine_online /{print $2}'; }
appcode(){ curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$1" 2>/dev/null; }

echo "── T0  BASELINE ───────────────────────────────"
echo "   ai_engine_online = $(gauge)   (1 = live MiniMax-M3)"
echo "   backend  = $(appcode http://localhost:8000/api/command/snapshot)   ai = $(appcode http://localhost:8001/health)   ui = $(appcode http://localhost:3100)"

echo "── SIMULATE FAILURE: kill AI inference service ─"
pkill -f 'uvicorn main:app .*--port 8001'
echo "   ai-service /health = $(appcode http://localhost:8001/health)  (000 = down)"

echo "── observe GRACEFUL DEGRADATION ───────────────"
for i in $(seq 1 12); do
  g=$(gauge)
  echo "   t+$((i*4))s  ai_engine_online=$g  backend=$(appcode http://localhost:8000/api/command/snapshot)  ui=$(appcode http://localhost:3100)"
  [ "$g" = "0.0" ] && { echo "   -> DEGRADED: AI offline, but swarm + UI STILL SERVING (no crash)"; break; }
  sleep 4
done

echo "── RECOVERY: restart AI inference service ─────"
cd "$AI_DIR"
nohup .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --log-level warning >/tmp/ai-service.log 2>&1 &
disown
until [ "$(appcode http://localhost:8001/health)" = "200" ]; do sleep 1; done
echo "   ai-service /health = 200 (back up)"
for i in $(seq 1 12); do
  g=$(gauge)
  echo "   t+$((i*5))s  ai_engine_online=$g"
  [ "$g" = "1.0" ] && { echo "   -> RECOVERED: live MiniMax-M3 back online"; break; }
  sleep 5
done
echo "── DR demo complete ───────────────────────────"
