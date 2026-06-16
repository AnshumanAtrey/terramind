"""Request / response schemas for the AI inference service."""
from typing import Optional

from pydantic import BaseModel


class MarkerIn(BaseModel):
    description: str
    priority: str = "high"


class AnalyzeRequest(BaseModel):
    """Analyze a specific frame: pass either a base64 image or a frame filename."""
    image_b64: Optional[str] = None
    image_ref: Optional[str] = None
    markers: list[MarkerIn] = []


class ScanRequest(BaseModel):
    """Pick a random frame from the image library and analyze it."""
    markers: list[MarkerIn] = []


class Detection(BaseModel):
    detected: bool
    label: str
    confidence: int
    priority: str
    summary: str
    matched_marker_index: Optional[int] = None
    model: str
    source: str  # "minimax-m3" | "mock"
    latency_ms: int


class ScanResponse(Detection):
    frame: str
