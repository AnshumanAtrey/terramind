// ─── TerraMind domain model ───────────────────────────────────────────────
// Shared types for the Drone Swarm Command & Geospatial Intelligence Platform.

export type DroneStatus =
  | 'patrolling'
  | 'investigating'
  | 'intercepting'
  | 'returning'
  | 'offline';

export type DroneRole = 'recon' | 'interceptor';

export interface Drone {
  id: string;
  callsign: string;
  role: DroneRole;
  status: DroneStatus;
  lat: number;
  lon: number;
  altitude: number; // meters AGL
  battery: number; // %
  signal: number; // %
  speedKmh: number;
  headingDeg: number;
  assignedThreatId: string | null;
}

export type ThreatPriority = 'low' | 'medium' | 'high' | 'critical';

export type ThreatStatus =
  | 'detected'
  | 'confirmed'
  | 'intercepting'
  | 'neutralized'
  | 'dismissed';

export interface Threat {
  id: string;
  label: string; // what the AI matched, e.g. "vehicle convoy"
  matchedMarkerId: string | null;
  confidence: number; // 0-100
  priority: ThreatPriority;
  status: ThreatStatus;
  lat: number;
  lon: number;
  gridRef: string; // "B7"
  detectedBy: string; // drone id
  imageRef: string; // which camera-feed frame triggered it
  aiSummary: string; // human-readable AI verdict
  createdAt: number; // epoch ms
}

export interface WatchMarker {
  id: string;
  description: string; // operator-defined target, natural language
  priority: ThreatPriority;
  active: boolean;
  matches: number; // how many threats this marker has produced
  createdAt: number;
}

export interface TelemetrySample {
  t: number; // epoch ms
  label: string; // HH:MM:SS
  throughputMbps: number;
  activeDrones: number;
  detections: number;
  aiLatencyMs: number;
}

export type AiEngineState = 'online' | 'degraded' | 'offline';

export interface SystemStatus {
  aiEngine: AiEngineState;
  aoCodename: string;
  totalDrones: number;
  activeDrones: number;
  activeThreats: number;
  neutralizedToday: number;
  framesAnalyzed: number;
  uptimeSec: number;
}

export type EventLevel = 'info' | 'warn' | 'threat' | 'success';

export interface SystemEvent {
  id: string;
  t: number;
  level: EventLevel;
  source: string; // drone callsign / "AI-CORE" / "CMD"
  message: string;
}

export interface CommandSnapshot {
  status: SystemStatus;
  drones: Drone[];
  threats: Threat[];
  markers: WatchMarker[];
  telemetry: TelemetrySample[];
  events: SystemEvent[];
}
