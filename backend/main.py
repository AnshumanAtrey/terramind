"""TerraMind Command Backend.

Owns the authoritative swarm simulation, drives real MiniMax-M3 scans on a loop,
persists watch markers + the AI detection log, and serves the command snapshot
the Next.js console renders. Exposes Prometheus metrics at /metrics.
"""
import asyncio
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

import ai_client
from config import settings
from database import Base, SessionLocal, engine
from db_models import DetectionRow, MarkerRow
from schemas import MarkerCreate, MarkerOut, SnapshotOut
from simulation import SwarmSim

sim = SwarmSim(settings.ao_codename)

# ── Prometheus custom metrics ────────────────────────────────────────────────
ACTIVE_DRONES = Gauge("terramind_active_drones", "Drones currently active")
ACTIVE_THREATS = Gauge("terramind_active_threats", "Threats currently active")
NEUTRALIZED = Gauge("terramind_neutralized_total", "Threats neutralized this session")
FRAMES = Gauge("terramind_frames_analyzed_total", "Frames analyzed by AI")
AI_ONLINE = Gauge("terramind_ai_engine_online", "1 if last AI scan hit the live model")
THREATS_INJECTED = Counter("terramind_threats_injected_total", "AI-confirmed threats", ["priority"])


# ── DB helpers ───────────────────────────────────────────────────────────────
DEFAULT_MARKERS = [
    ("mk-convoy", "Armored vehicle convoy in open terrain", "high"),
    ("mk-aircraft", "Unauthorized aircraft on runway or apron", "critical"),
    ("mk-personnel", "Personnel movement near perimeter", "medium"),
]


def seed_markers():
    with SessionLocal() as db:
        if db.query(MarkerRow).count() == 0:
            now = int(time.time() * 1000)
            for mid, desc, pri in DEFAULT_MARKERS:
                db.add(MarkerRow(id=mid, description=desc, priority=pri, active=True, matches=0, created_at=now))
            db.commit()


def marker_dict(m: MarkerRow) -> dict:
    return {
        "id": m.id, "description": m.description, "priority": m.priority,
        "active": m.active, "matches": m.matches, "created_at": m.created_at,
    }


def list_markers() -> list[dict]:
    with SessionLocal() as db:
        rows = db.query(MarkerRow).order_by(MarkerRow.created_at.desc()).all()
        return [marker_dict(m) for m in rows]


def active_markers() -> list[dict]:
    with SessionLocal() as db:
        rows = db.query(MarkerRow).filter(MarkerRow.active.is_(True)).order_by(MarkerRow.created_at.desc()).all()
        return [marker_dict(m) for m in rows]


def bump_marker(marker_id: str):
    with SessionLocal() as db:
        m = db.get(MarkerRow, marker_id)
        if m:
            m.matches += 1
            db.commit()


def persist_detection(threat: dict, source: str):
    with SessionLocal() as db:
        db.add(DetectionRow(
            id=threat["id"], label=threat["label"], confidence=threat["confidence"],
            priority=threat["priority"], status=threat["status"], grid_ref=threat["grid_ref"],
            detected_by=threat["detected_by"], image_ref=threat["image_ref"],
            ai_summary=threat["ai_summary"], source=source,
            lat=threat["lat"], lon=threat["lon"], created_at=threat["created_at"],
        ))
        db.commit()


# ── one AI scan: markers -> MiniMax-M3 -> threat injection ───────────────────
async def run_scan() -> dict:
    markers = active_markers()
    if not markers:
        return {"detected": False, "reason": "no active markers"}
    result = await ai_client.scan([{"description": m["description"], "priority": m["priority"]} for m in markers])
    if not result:
        sim.ai_engine = "degraded"
        AI_ONLINE.set(0)
        return {"detected": False, "reason": "ai-service unreachable", "degraded": True}

    source = result.get("source", "minimax-m3")
    sim.ai_engine = "online" if source == "minimax-m3" else "degraded"
    AI_ONLINE.set(1 if source == "minimax-m3" else 0)

    idx = result.get("matched_marker_index")
    marker_id = markers[idx]["id"] if isinstance(idx, int) and 0 <= idx < len(markers) else None
    threat = sim.inject_detection(result, result.get("frame", "FRAME"), marker_id, bump_marker)
    if threat:
        persist_detection(threat, source)
        THREATS_INJECTED.labels(priority=threat["priority"]).inc()
    return {**result, "threat_created": bool(threat)}


# ── background loops ─────────────────────────────────────────────────────────
async def sim_loop():
    while True:
        sim.tick()
        ACTIVE_DRONES.set(sum(1 for d in sim.drones if d["status"] != "offline"))
        ACTIVE_THREATS.set(sim.active_threats())
        NEUTRALIZED.set(sim.neutralized)
        FRAMES.set(sim.frames_analyzed)
        await asyncio.sleep(1)


async def scan_loop():
    # small head start so the swarm is visibly patrolling before first scan
    await asyncio.sleep(5)
    while True:
        try:
            await run_scan()
        except Exception:
            sim.ai_engine = "degraded"
        await asyncio.sleep(settings.scan_interval_sec)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    seed_markers()
    tasks = [asyncio.create_task(sim_loop()), asyncio.create_task(scan_loop())]
    yield
    for t in tasks:
        t.cancel()


app = FastAPI(title="TerraMind Command Backend", version="1.0.0", lifespan=lifespan)

_origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

Instrumentator().instrument(app).expose(app)


# ── endpoints ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "command-backend"}


@app.get("/api/command/snapshot", response_model=SnapshotOut)
def snapshot():
    snap = sim.snapshot()
    snap["markers"] = list_markers()
    return SnapshotOut(**snap)


@app.get("/api/markers", response_model=list[MarkerOut])
def get_markers():
    return [MarkerOut(**m) for m in list_markers()]


@app.post("/api/markers", response_model=MarkerOut)
def create_marker(body: MarkerCreate):
    desc = body.description.strip()
    if not desc:
        raise HTTPException(status_code=400, detail="description required")
    row = MarkerRow(
        id=f"mk-{uuid.uuid4().hex[:6]}", description=desc, priority=body.priority,
        active=True, matches=0, created_at=int(time.time() * 1000),
    )
    with SessionLocal() as db:
        db.add(row)
        db.commit()
        out = marker_dict(row)
    sim._event("info", "CMD", f'Watch marker armed: "{desc}".')
    return MarkerOut(**out)


@app.post("/api/markers/{marker_id}/toggle", response_model=MarkerOut)
def toggle_marker(marker_id: str):
    with SessionLocal() as db:
        m = db.get(MarkerRow, marker_id)
        if not m:
            raise HTTPException(status_code=404, detail="marker not found")
        m.active = not m.active
        db.commit()
        out = marker_dict(m)
    sim._event("info", "CMD", f'Watch marker {"armed" if out["active"] else "disarmed"}: "{out["description"]}".')
    return MarkerOut(**out)


@app.delete("/api/markers/{marker_id}")
def delete_marker(marker_id: str):
    with SessionLocal() as db:
        m = db.get(MarkerRow, marker_id)
        if not m:
            raise HTTPException(status_code=404, detail="marker not found")
        desc = m.description
        db.delete(m)
        db.commit()
    sim._event("info", "CMD", f'Watch marker removed: "{desc}".')
    return {"ok": True}


@app.post("/api/scan")
async def manual_scan():
    """Trigger an immediate AI scan — the live demo 'RUN AI SCAN' button."""
    return await run_scan()
