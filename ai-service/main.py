"""TerraMind AI Inference Service.

Exposes the vision engine (MiniMax-M3) as a standalone microservice so it can be
scaled, scanned, and chaos-tested independently of the command backend.
"""
import os
import random

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

import vision
from config import settings
from models import AnalyzeRequest, Detection, ScanRequest, ScanResponse

app = FastAPI(title="TerraMind AI Inference Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── custom Prometheus metrics (scraped at /metrics) ──────────────────────────
SCANS = Counter("terramind_ai_scans_total", "AI frame analyses", ["source", "detected"])
DETECTIONS = Counter("terramind_ai_detections_total", "Confirmed AI detections", ["priority"])
LATENCY = Histogram("terramind_ai_latency_seconds", "AI inference latency", ["source"])

Instrumentator().instrument(app).expose(app)

ALLOWED_EXT = (".png", ".jpg", ".jpeg", ".webp")


def _list_frames() -> list[str]:
    d = settings.image_dir
    if not os.path.isdir(d):
        return []
    return sorted(f for f in os.listdir(d) if f.lower().endswith(ALLOWED_EXT))


def _load_frame(name: str) -> bytes:
    safe = os.path.basename(name)  # prevent path traversal
    path = os.path.join(settings.image_dir, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"frame not found: {safe}")
    with open(path, "rb") as fh:
        return fh.read()


def _record(det: Detection) -> None:
    SCANS.labels(source=det.source, detected=str(det.detected).lower()).inc()
    LATENCY.labels(source=det.source).observe(det.latency_ms / 1000.0)
    if det.detected:
        DETECTIONS.labels(priority=det.priority).inc()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-inference"}


@app.get("/ready")
def ready():
    return {
        "status": "ready",
        "live": settings.live_enabled,
        "mode": "minimax-m3" if settings.live_enabled else "mock",
    }


@app.get("/info")
def info():
    return {
        "model": settings.ai_model,
        "base_url": settings.tokenrouter_base_url,
        "live": settings.live_enabled,
        "force_mock": settings.ai_force_mock,
        "frames_available": len(_list_frames()),
    }


@app.get("/frames")
def frames():
    return {"frames": _list_frames(), "image_dir": settings.image_dir}


@app.get("/frames/{name}")
def get_frame(name: str):
    """Serve a camera-feed image so the console can show what the AI analyzed."""
    safe = os.path.basename(name)  # prevent path traversal
    path = os.path.join(settings.image_dir, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"frame not found: {safe}")
    return FileResponse(path)


@app.post("/analyze", response_model=Detection)
def analyze(req: AnalyzeRequest):
    if req.image_b64:
        import base64

        try:
            data = base64.b64decode(req.image_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="invalid base64 image")
    elif req.image_ref:
        data = _load_frame(req.image_ref)
    else:
        raise HTTPException(status_code=400, detail="provide image_b64 or image_ref")

    det = vision.analyze(data, req.markers)
    _record(det)
    return det


@app.post("/scan", response_model=ScanResponse)
def scan(req: ScanRequest):
    frames = _list_frames()
    if not frames:
        raise HTTPException(status_code=503, detail="no frames in image library")
    frame = random.choice(frames)
    det = vision.analyze(_load_frame(frame), req.markers)
    _record(det)
    return ScanResponse(**det.model_dump(), frame=frame)
