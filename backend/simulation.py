"""Swarm simulation — reconnaissance-sweep model.

The AO is ONE real base (Naval Station Norfolk). Targets sit at the real
coordinates of actual ships/aircraft visible on the Esri satellite layer. Recon
drones sweep the base; when a drone reaches a target, MiniMax-M3 confirms what is
there (see main.py) and a flag is dropped ON that real object. Interceptors then
neutralize it. Everything resets and loops.
"""
import math
import random
import string
import time
import uuid

# ── Area of operations: Naval Station Norfolk ────────────────────────────────
AO_CENTER_LAT = 36.9430
AO_CENTER_LON = -76.3150
AO_RADIUS = 0.050

# Pre-known targets — real coordinates of actual assets on the base. Each carries
# the camera frame the AI analyzes when a drone reaches it.
TARGETS = [
    {"id": "tgt-cv1", "name": "Pier 12 (CVN)", "lat": 36.9546, "lon": -76.3296, "frame": "norfolk_carriers.jpg"},
    {"id": "tgt-cv2", "name": "Pier 14 (CVN)", "lat": 36.9512, "lon": -76.3315, "frame": "naval_fordisland.jpg"},
    {"id": "tgt-dd1", "name": "Destroyer Piers", "lat": 36.9472, "lon": -76.3302, "frame": "naval_yokosuka.jpg"},
    {"id": "tgt-ff1", "name": "South Piers", "lat": 36.9434, "lon": -76.3289, "frame": "naval_subic.jpg"},
    {"id": "tgt-lsd", "name": "Amphib Piers", "lat": 36.9402, "lon": -76.3266, "frame": "amphib_littlecreek.jpg"},
    {"id": "tgt-air", "name": "Chambers Field", "lat": 36.9376, "lon": -76.2958, "frame": "boneyard_amarg.jpg"},
]

ARRIVE_DIST = 0.0022      # ~250 m — recon "reaches" a target
NEUTRALIZE_DIST = 0.0022  # interceptor "reaches" a flagged target
COOLDOWN_SEC = 16         # how long before a resolved target re-arms (loops the demo)
SPEED_SCALE = 0.4         # tuning so drone travel is visible


def _now_ms() -> int:
    return int(time.time() * 1000)


def _uid(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:6]}"


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def grid_ref(lat: float, lon: float) -> str:
    west = AO_CENTER_LON - AO_RADIUS
    south = AO_CENTER_LAT - AO_RADIUS
    col = _clamp(int((lon - west) / (2 * AO_RADIUS) * 8), 0, 7)
    row = _clamp(int((lat - south) / (2 * AO_RADIUS) * 8) + 1, 1, 8)
    return f"{string.ascii_uppercase[col]}{row}"


class SwarmSim:
    def __init__(self, ao_codename: str):
        self.ao = ao_codename
        self.targets = [
            {**t, "status": "unscanned", "threat_id": None, "cooldown_at": 0.0} for t in TARGETS
        ]
        self.drones: list[dict] = []
        self.threats: list[dict] = []
        self.telemetry: list[dict] = []
        self.events: list[dict] = []
        self._pending: list[str] = []  # target ids awaiting an AI scan

        self.started = time.monotonic()
        self.last_tick = time.monotonic()
        self.last_telemetry = 0.0
        self.frames_analyzed = 0
        self.neutralized = 0
        self.ai_engine = "online"

        self._seed_drones()
        self._event("info", "CMD", f"{ao_codename} — swarm on station. Beginning ISR sweep.")

    # ── seeding ──────────────────────────────────────────────────────────────
    def _seed_drones(self):
        for i in range(4):
            self._add_drone(f"RAVEN-{i + 1}", "recon", (420, 640))
        for i in range(2):
            self._add_drone(f"LANCE-{i + 1}", "interceptor", (320, 480))

    def _add_drone(self, callsign, role, alt_range):
        lat = AO_CENTER_LAT + random.uniform(-0.03, 0.03)
        lon = AO_CENTER_LON + random.uniform(-0.03, 0.03)
        self.drones.append({
            "id": _uid("drn"),
            "callsign": callsign,
            "role": role,
            "status": "patrolling",
            "lat": lat,
            "lon": lon,
            "altitude": round(random.uniform(*alt_range)),
            "battery": round(random.uniform(74, 99)),
            "signal": round(random.uniform(82, 99)),
            "speed_kmh": round(random.uniform(120, 180)),
            "heading_deg": round(random.uniform(0, 359)),
            "assigned_threat_id": None,
            "_target_id": None,
            "_home_lat": lat,
            "_home_lon": lon,
            "_phase": random.uniform(0, math.tau),
        })

    # ── events ───────────────────────────────────────────────────────────────
    def _event(self, level, source, message):
        self.events.insert(0, {"id": _uid("ev"), "t": _now_ms(), "level": level, "source": source, "message": message})
        del self.events[60:]

    # ── helpers ──────────────────────────────────────────────────────────────
    def _target(self, tid):
        return next((t for t in self.targets if t["id"] == tid), None)

    def _free_interceptor(self):
        return next((d for d in self.drones if d["role"] == "interceptor"
                     and d["status"] != "intercepting" and not d["assigned_threat_id"]), None)

    def active_threats(self) -> int:
        return sum(1 for t in self.threats if t["status"] in ("detected", "confirmed", "intercepting"))

    def target_frame(self, tid) -> str | None:
        t = self._target(tid)
        return t["frame"] if t else None

    def take_pending(self) -> str | None:
        """Pop one target id that a drone has reached and that needs an AI scan."""
        return self._pending.pop(0) if self._pending else None

    # ── AI scan result handling (called from main.py) ────────────────────────
    def resolve_scan(self, target_id: str, detection: dict, marker_id, bump_marker_cb):
        self.frames_analyzed += 1
        t = self._target(target_id)
        if not t or t["status"] != "scanning":
            return None
        if not detection.get("detected"):
            t["status"] = "cleared"
            t["cooldown_at"] = time.monotonic()
            self._event("info", "AI-CORE", f"{t['name']} @ {grid_ref(t['lat'], t['lon'])} — no match, cleared.")
            return None

        scanner = next((d["callsign"] for d in self.drones if d["_target_id"] is None and d["role"] == "recon"), "RAVEN-1")
        threat = {
            "id": _uid("thr"),
            "label": detection.get("label", "contact"),
            "matched_marker_id": marker_id,
            "confidence": int(detection.get("confidence", 0)),
            "priority": detection.get("priority", "high"),
            "status": "confirmed",
            "lat": t["lat"],
            "lon": t["lon"],
            "grid_ref": grid_ref(t["lat"], t["lon"]),
            "detected_by": scanner,
            "image_ref": t["frame"],
            "ai_summary": detection.get("summary", ""),
            "created_at": _now_ms(),
        }
        self.threats.insert(0, threat)
        t["status"] = "flagged"
        t["threat_id"] = threat["id"]
        if marker_id and bump_marker_cb:
            bump_marker_cb(marker_id)
        self._event("threat", "AI-CORE", f"FLAGGED: {threat['label']} @ {t['name']} ({threat['confidence']}%).")

        lance = self._free_interceptor()
        if lance:
            lance["assigned_threat_id"] = threat["id"]
            lance["status"] = "intercepting"
            threat["status"] = "intercepting"
            self._event("info", lance["callsign"], f"Vectoring to intercept {t['name']}.")
        return threat

    # ── core tick ────────────────────────────────────────────────────────────
    def tick(self):
        now = time.monotonic()
        dt = _clamp(now - self.last_tick, 0, 3)
        self.last_tick = now

        for d in self.drones:
            if d["role"] == "recon":
                self._move_recon(d, dt)
            else:
                self._move_interceptor(d, dt)

        self._reset_cooldowns(now)
        self._prune_threats(now)
        self._sample_telemetry(now)

    def _step_toward(self, d, tlat, tlon, dt) -> float:
        dlat, dlon = tlat - d["lat"], tlon - d["lon"]
        dist = math.hypot(dlat, dlon)
        d["heading_deg"] = round((math.degrees(math.atan2(dlon, dlat)) + 360) % 360)
        if dist > 1e-9:
            step = (d["speed_kmh"] / 3600) * dt * SPEED_SCALE
            d["lat"] += dlat / dist * min(step, dist)
            d["lon"] += dlon / dist * min(step, dist)
        # battery / signal drift
        d["battery"] = _clamp(d["battery"] - 0.02 * dt, 35, 100)
        d["signal"] = _clamp(d["signal"] + random.uniform(-1.2, 1.2), 60, 100)
        d["altitude"] = round(_clamp(d["altitude"] + random.uniform(-3, 3), 250, 720))
        return dist

    def _move_recon(self, d, dt):
        # pick a target to sweep if free
        if d["_target_id"] is None:
            cands = [t for t in self.targets if t["status"] == "unscanned"]
            if cands:
                tgt = min(cands, key=lambda t: math.hypot(t["lat"] - d["lat"], t["lon"] - d["lon"]))
                tgt["status"] = "enroute"
                d["_target_id"] = tgt["id"]
                d["status"] = "patrolling"
        if d["_target_id"]:
            tgt = self._target(d["_target_id"])
            if not tgt or tgt["status"] not in ("enroute",):
                d["_target_id"] = None
                return
            dist = self._step_toward(d, tgt["lat"], tgt["lon"], dt)
            d["status"] = "patrolling"
            if dist < ARRIVE_DIST:
                tgt["status"] = "scanning"
                self._pending.append(tgt["id"])
                self._event("info", d["callsign"], f"On target {tgt['name']} — imaging, running AI match.")
                d["_target_id"] = None
                d["status"] = "investigating"
        else:
            # nothing to sweep — loiter near home
            d["_phase"] += 0.6 * dt
            d["lat"] = d["_home_lat"] + 0.012 * math.sin(d["_phase"])
            d["lon"] = d["_home_lon"] + 0.012 * math.cos(d["_phase"])
            d["heading_deg"] = round((math.degrees(d["_phase"]) + 90) % 360)
            d["status"] = "patrolling"

    def _move_interceptor(self, d, dt):
        if d["assigned_threat_id"]:
            tgt = next((t for t in self.threats if t["id"] == d["assigned_threat_id"]), None)
            if not tgt:
                d["assigned_threat_id"] = None
                d["status"] = "returning"
                return
            dist = self._step_toward(d, tgt["lat"], tgt["lon"], dt)
            d["status"] = "intercepting"
            if dist < NEUTRALIZE_DIST:
                tgt["status"] = "neutralized"
                self.neutralized += 1
                target = next((t for t in self.targets if t.get("threat_id") == tgt["id"]), None)
                if target:
                    target["status"] = "neutralized"
                    target["cooldown_at"] = time.monotonic()
                name = target["name"] if target else tgt["grid_ref"]
                self._event("success", d["callsign"], f"Target {name} neutralized — {tgt['label']}.")
                d["assigned_threat_id"] = None
                d["status"] = "returning"
        elif d["status"] == "returning":
            dist = self._step_toward(d, d["_home_lat"], d["_home_lon"], dt)
            if dist < 0.01:
                d["status"] = "patrolling"
        else:
            d["_phase"] += 0.5 * dt
            d["lat"] = d["_home_lat"] + 0.018 * math.sin(d["_phase"])
            d["lon"] = d["_home_lon"] + 0.018 * math.cos(d["_phase"])
            d["heading_deg"] = round((math.degrees(d["_phase"]) + 90) % 360)
            d["battery"] = _clamp(d["battery"] + 0.05 * dt, 0, 100)

    def _reset_cooldowns(self, now):
        for t in self.targets:
            if t["status"] in ("cleared", "neutralized") and now - t["cooldown_at"] > COOLDOWN_SEC:
                t["status"] = "unscanned"
                t["threat_id"] = None

    def _prune_threats(self, now):
        ms = _now_ms()
        self.threats = [
            t for t in self.threats
            if not (t["status"] in ("neutralized", "dismissed") and (ms - t["created_at"]) / 1000 > 16)
        ]

    def _sample_telemetry(self, now):
        if now - self.last_telemetry <= 1.5:
            return
        self.last_telemetry = now
        active = sum(1 for d in self.drones if d["status"] != "offline")
        self.telemetry.append({
            "t": _now_ms(),
            "label": time.strftime("%H:%M:%S"),
            "throughput_mbps": round(random.uniform(180, 340) + active * 12),
            "active_drones": active,
            "detections": self.active_threats(),
            "ai_latency_ms": round(random.uniform(420, 920)),
        })
        del self.telemetry[:-40]

    # ── snapshot ─────────────────────────────────────────────────────────────
    def public_drone(self, d) -> dict:
        return {k: d[k] for k in (
            "id", "callsign", "role", "status", "lat", "lon", "altitude",
            "battery", "signal", "speed_kmh", "heading_deg", "assigned_threat_id",
        )}

    def snapshot(self) -> dict:
        active = sum(1 for d in self.drones if d["status"] != "offline")
        return {
            "status": {
                "ai_engine": self.ai_engine,
                "ao_codename": self.ao,
                "total_drones": len(self.drones),
                "active_drones": active,
                "active_threats": self.active_threats(),
                "neutralized_today": self.neutralized,
                "frames_analyzed": self.frames_analyzed,
                "uptime_sec": int(time.monotonic() - self.started),
            },
            "drones": [self.public_drone(d) for d in self.drones],
            "threats": list(self.threats),
            "telemetry": list(self.telemetry),
            "events": list(self.events),
        }
