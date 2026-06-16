"""Authoritative swarm simulation for the command backend.

Drones, telemetry and events are simulated here; THREATS are injected from real
MiniMax-M3 detections (see main.py scan loop), then run through their lifecycle
(detected -> confirmed -> intercepting -> neutralized) with interceptor tasking.
"""
import math
import random
import string
import time
import uuid

AO_CENTER_LAT = 24.95
AO_CENTER_LON = 55.18
AO_RADIUS = 0.13

CONFIRM_THRESHOLD = 55  # AI confidence at/above which a contact is auto-confirmed


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
        self.drones: list[dict] = []
        self.threats: list[dict] = []
        self.telemetry: list[dict] = []
        self.events: list[dict] = []
        self.started = time.monotonic()
        self.last_tick = time.monotonic()
        self.last_telemetry = 0.0
        self.frames_analyzed = 0
        self.neutralized = 0
        self.ai_engine = "online"
        self._seed_drones()
        self._event("info", "CMD", f"{ao_codename} command link established. Swarm online.")

    # ── seeding ──────────────────────────────────────────────────────────────
    def _seed_drones(self):
        for i in range(5):
            self._add_drone(f"RAVEN-{i + 1}", "recon", (0.02, 0.05), (380, 620), (0.05, 0.12))
        for i in range(2):
            self._add_drone(f"LANCE-{i + 1}", "interceptor", (0.012, 0.025), (300, 450), (0.04, 0.09))

    def _add_drone(self, callsign, role, r_range, alt_range, ang_range):
        o_lat = AO_CENTER_LAT + random.uniform(-0.07, 0.07)
        o_lon = AO_CENTER_LON + random.uniform(-0.07, 0.07)
        r = random.uniform(*r_range)
        phase = random.uniform(0, math.tau)
        self.drones.append(
            {
                "id": _uid("drn"),
                "callsign": callsign,
                "role": role,
                "status": "patrolling",
                "lat": o_lat + r * math.sin(phase),
                "lon": o_lon + r * math.cos(phase),
                "altitude": round(random.uniform(*alt_range)),
                "battery": round(random.uniform(72, 99)),
                "signal": round(random.uniform(82, 99)),
                "speed_kmh": round(random.uniform(45, 85)),
                "heading_deg": round(random.uniform(0, 359)),
                "assigned_threat_id": None,
                "_o_lat": o_lat,
                "_o_lon": o_lon,
                "_r": r,
                "_phase": phase,
                "_av": random.uniform(*ang_range) * random.choice([1, -1]),
            }
        )

    # ── events ───────────────────────────────────────────────────────────────
    def _event(self, level, source, message):
        self.events.insert(0, {"id": _uid("ev"), "t": _now_ms(), "level": level, "source": source, "message": message})
        del self.events[60:]

    def _free_interceptor(self):
        return next(
            (d for d in self.drones if d["role"] == "interceptor" and d["status"] == "patrolling" and not d["assigned_threat_id"]),
            None,
        )

    def active_threats(self) -> int:
        return sum(1 for t in self.threats if t["status"] in ("detected", "confirmed", "intercepting"))

    def recon_callsign(self) -> str:
        recon = [d for d in self.drones if d["role"] == "recon"]
        return random.choice(recon)["callsign"] if recon else "RAVEN-1"

    # ── threat injection from a real AI detection ────────────────────────────
    def inject_detection(self, det: dict, frame: str, marker_id, marker_matches_cb) -> dict | None:
        self.frames_analyzed += 1
        if not det.get("detected"):
            return None
        lat = AO_CENTER_LAT + random.uniform(-AO_RADIUS * 0.8, AO_RADIUS * 0.8)
        lon = AO_CENTER_LON + random.uniform(-AO_RADIUS * 0.8, AO_RADIUS * 0.8)
        threat = {
            "id": _uid("thr"),
            "label": det.get("label", "contact"),
            "matched_marker_id": marker_id,
            "confidence": int(det.get("confidence", 0)),
            "priority": det.get("priority", "low"),
            "status": "detected",
            "lat": lat,
            "lon": lon,
            "grid_ref": grid_ref(lat, lon),
            "detected_by": self.recon_callsign(),
            "image_ref": frame,
            "ai_summary": det.get("summary", ""),
            "created_at": _now_ms(),
        }
        self.threats.insert(0, threat)
        if marker_id and marker_matches_cb:
            marker_matches_cb(marker_id)
        src = det.get("source", "minimax-m3")
        self._event("threat", "AI-CORE", f"{threat['label']} @ {threat['grid_ref']} ({threat['confidence']}% · {src}).")
        return threat

    # ── core tick ────────────────────────────────────────────────────────────
    def tick(self):
        now = time.monotonic()
        dt = _clamp(now - self.last_tick, 0, 3)
        self.last_tick = now

        for d in self.drones:
            self._move_drone(d, dt)

        self._advance_threats()
        self._sample_telemetry(now)

    def _move_drone(self, d, dt):
        if d["status"] == "intercepting" and d["assigned_threat_id"]:
            tgt = next((t for t in self.threats if t["id"] == d["assigned_threat_id"]), None)
            if not tgt:
                d["assigned_threat_id"] = None
                d["status"] = "returning"
            else:
                d_lat, d_lon = tgt["lat"] - d["lat"], tgt["lon"] - d["lon"]
                dist = math.hypot(d_lat, d_lon)
                d["heading_deg"] = round((math.degrees(math.atan2(d_lon, d_lat)) + 360) % 360)
                if dist < 0.004:
                    tgt["status"] = "neutralized"
                    self.neutralized += 1
                    self._event("success", d["callsign"], f"Target {tgt['grid_ref']} neutralized — {tgt['label']}.")
                    d["assigned_threat_id"] = None
                    d["status"] = "returning"
                else:
                    step = (d["speed_kmh"] / 3600) * dt * 0.9
                    d["lat"] += d_lat / dist * min(step, dist)
                    d["lon"] += d_lon / dist * min(step, dist)
        elif d["status"] == "returning":
            d_lat, d_lon = d["_o_lat"] - d["lat"], d["_o_lon"] - d["lon"]
            dist = math.hypot(d_lat, d_lon)
            if dist < 0.006:
                d["status"] = "patrolling"
            else:
                step = (d["speed_kmh"] / 3600) * dt * 0.9
                d["lat"] += d_lat / dist * min(step, dist)
                d["lon"] += d_lon / dist * min(step, dist)
        else:
            d["_phase"] += d["_av"] * dt
            d["lat"] = d["_o_lat"] + d["_r"] * math.sin(d["_phase"])
            d["lon"] = d["_o_lon"] + d["_r"] * math.cos(d["_phase"])
            d["heading_deg"] = round((math.degrees(d["_phase"]) + (90 if d["_av"] > 0 else -90) + 360) % 360)

        drain = 0.05 if d["status"] == "intercepting" else 0.02
        d["battery"] = _clamp(d["battery"] - drain * dt, 35, 100)
        if d["status"] == "returning":
            d["battery"] = _clamp(d["battery"] + 0.4 * dt, 0, 100)
        d["signal"] = _clamp(d["signal"] + random.uniform(-1.5, 1.5), 60, 100)
        d["altitude"] = round(_clamp(d["altitude"] + random.uniform(-4, 4), 250, 700))

    def _advance_threats(self):
        now = _now_ms()
        for t in self.threats:
            age = (now - t["created_at"]) / 1000
            if t["status"] == "detected" and age > 2.5:
                if t["confidence"] >= CONFIRM_THRESHOLD:
                    t["status"] = "confirmed"
                    self._event("threat", "AI-CORE", f"CONFIRMED: {t['label']} @ {t['grid_ref']} ({t['confidence']}%).")
                    lance = self._free_interceptor()
                    if lance and t["priority"] in ("high", "critical"):
                        lance["assigned_threat_id"] = t["id"]
                        lance["status"] = "intercepting"
                        t["status"] = "intercepting"
                        t["detected_by"] = lance["callsign"]
                        self._event("info", lance["callsign"], f"Vectoring to intercept {t['grid_ref']}.")
                elif age > 10:
                    t["status"] = "dismissed"
                    self._event("info", "AI-CORE", f"Contact @ {t['grid_ref']} dismissed — below threshold.")
        self.threats = [
            t for t in self.threats
            if not (t["status"] in ("neutralized", "dismissed") and (now - t["created_at"]) / 1000 > 18)
        ]

    def _sample_telemetry(self, now):
        if now - self.last_telemetry <= 1.5:
            return
        self.last_telemetry = now
        active = sum(1 for d in self.drones if d["status"] != "offline")
        self.telemetry.append(
            {
                "t": _now_ms(),
                "label": time.strftime("%H:%M:%S"),
                "throughput_mbps": round(random.uniform(180, 340) + active * 12),
                "active_drones": active,
                "detections": self.active_threats(),
                "ai_latency_ms": round(random.uniform(420, 920)),
            }
        )
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
