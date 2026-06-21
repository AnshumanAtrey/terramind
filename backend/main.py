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
from fastapi.responses import Response
from prometheus_client import Counter, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

import ai_client
from config import settings
from database import Base, SessionLocal, engine
from db_models import DetectionRow, MarkerRow
from schemas import DetectionOut, DetectionPage, MarkerCreate, MarkerOut, SnapshotOut
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
    ("mk-aircraft", "Military aircraft massed on an airfield, apron, or runway", "high"),
    ("mk-naval", "Naval warships or aircraft carriers at port", "critical"),
    ("mk-convoy", "Armored vehicle convoy or vehicle staging area", "high"),
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


# ── scan the target a drone reached: MiniMax-M3 -> flag on the real object ────
async def scan_target(target_id: str) -> dict:
    frame = sim.target_frame(target_id)
    if not frame:
        return {"detected": False, "reason": "unknown target"}
    markers = active_markers()
    result = await ai_client.analyze_frame(
        frame, [{"description": m["description"], "priority": m["priority"]} for m in markers]
    )
    if not result:
        sim.ai_engine = "degraded"
        AI_ONLINE.set(0)
        sim.resolve_scan(target_id, {"detected": False}, None, bump_marker)
        return {"detected": False, "reason": "ai-service unreachable", "degraded": True}

    source = result.get("source", "minimax-m3")
    sim.ai_engine = "online" if source == "minimax-m3" else "degraded"
    AI_ONLINE.set(1 if source == "minimax-m3" else 0)

    idx = result.get("matched_marker_index")
    marker_id = markers[idx]["id"] if isinstance(idx, int) and 0 <= idx < len(markers) else None
    threat = sim.resolve_scan(target_id, result, marker_id, bump_marker)
    if threat:
        persist_detection(threat, source)
        THREATS_INJECTED.labels(priority=threat["priority"]).inc()
    return {**result, "frame": frame, "threat_created": bool(threat)}


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
    # Drones drive the cadence: when one reaches a target, the sim queues a scan.
    await asyncio.sleep(4)
    while True:
        tid = sim.take_pending()
        if tid:
            try:
                await scan_target(tid)
            except Exception:
                sim.ai_engine = "degraded"
                sim.resolve_scan(tid, {"detected": False}, None, bump_marker)
        await asyncio.sleep(1.0)


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


@app.get("/api/detections", response_model=DetectionPage)
def list_detections(page: int = 1, page_size: int = 25, priority: str | None = None):
    """The persisted AI detection log (audit trail), server-side paginated so the
    UI never loads all rows at once."""
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    with SessionLocal() as db:
        q = db.query(DetectionRow)
        if priority:
            q = q.filter(DetectionRow.priority == priority)
        total = q.count()
        rows = (
            q.order_by(DetectionRow.created_at.desc(), DetectionRow.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
    items = [
        DetectionOut(
            id=r.id, label=r.label, confidence=r.confidence, priority=r.priority,
            status=r.status, grid_ref=r.grid_ref, detected_by=r.detected_by,
            image_ref=r.image_ref, ai_summary=r.ai_summary, source=r.source,
            lat=r.lat, lon=r.lon, created_at=r.created_at,
        )
        for r in rows
    ]
    total_pages = max(1, (total + page_size - 1) // page_size)
    return DetectionPage(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


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


@app.get("/api/frames/{name}")
async def get_frame(name: str):
    """Proxy a sensor-frame image from the ai-service to the browser."""
    res = await ai_client.fetch_frame(name)
    if not res:
        raise HTTPException(status_code=404, detail="frame not available")
    content, media_type = res
    return Response(content=content, media_type=media_type, headers={"Cache-Control": "public, max-age=3600"})


@app.post("/api/scan")
async def manual_scan():
    """Manually task the nearest un-swept target (demo 'RUN AI SCAN' button)."""
    tgt = next((t for t in sim.targets if t["status"] == "unscanned"), None)
    if not tgt:
        return {"detected": False, "reason": "no un-swept targets right now"}
    tgt["status"] = "scanning"
    return await scan_target(tgt["id"])
