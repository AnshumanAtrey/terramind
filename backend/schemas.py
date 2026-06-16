"""API schemas. Fields are snake_case in Python but serialize to camelCase JSON
so they drop straight into the Next.js frontend's TypeScript types."""
from typing import Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class DroneOut(CamelModel):
    id: str
    callsign: str
    role: str
    status: str
    lat: float
    lon: float
    altitude: int
    battery: float
    signal: float
    speed_kmh: int
    heading_deg: int
    assigned_threat_id: Optional[str] = None


class ThreatOut(CamelModel):
    id: str
    label: str
    matched_marker_id: Optional[str] = None
    confidence: int
    priority: str
    status: str
    lat: float
    lon: float
    grid_ref: str
    detected_by: str
    image_ref: str
    ai_summary: str
    created_at: int


class MarkerOut(CamelModel):
    id: str
    description: str
    priority: str
    active: bool
    matches: int
    created_at: int


class TelemetryOut(CamelModel):
    t: int
    label: str
    throughput_mbps: int
    active_drones: int
    detections: int
    ai_latency_ms: int


class EventOut(CamelModel):
    id: str
    t: int
    level: str
    source: str
    message: str


class StatusOut(CamelModel):
    ai_engine: str
    ao_codename: str
    total_drones: int
    active_drones: int
    active_threats: int
    neutralized_today: int
    frames_analyzed: int
    uptime_sec: int


class SnapshotOut(CamelModel):
    status: StatusOut
    drones: list[DroneOut]
    threats: list[ThreatOut]
    markers: list[MarkerOut]
    telemetry: list[TelemetryOut]
    events: list[EventOut]


class MarkerCreate(CamelModel):
    description: str
    priority: str = "high"
