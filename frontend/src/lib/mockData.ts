// ─── TerraMind in-browser simulation engine ───────────────────────────────
// Drives the whole command console with zero backend so the UI is demoable
// standalone. When NEXT_PUBLIC_API_URL is set, api.ts talks to FastAPI instead;
// if that backend dies mid-demo, the UI falls back here → "degraded mode".

import {
  CommandSnapshot,
  Drone,
  SystemEvent,
  TelemetrySample,
  Threat,
  ThreatPriority,
  WatchMarker,
} from './types';

export const AO_CENTER = { lat: 24.95, lon: 55.18 };
export const AO_CODENAME = 'AO SENTINEL';
export const AO_RADIUS_DEG = 0.13; // ~14 km half-span

const LETTERS = 'ABCDEFGH';

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function hhmmss(t: number) {
  const d = new Date(t);
  return d.toTimeString().slice(0, 8);
}

function gridRef(lat: number, lon: number): string {
  const west = AO_CENTER.lon - AO_RADIUS_DEG;
  const south = AO_CENTER.lat - AO_RADIUS_DEG;
  const col = clamp(Math.floor(((lon - west) / (2 * AO_RADIUS_DEG)) * 8), 0, 7);
  const row = clamp(Math.floor(((lat - south) / (2 * AO_RADIUS_DEG)) * 8) + 1, 1, 8);
  return `${LETTERS[col]}${row}`;
}

interface SimDrone extends Drone {
  _orbitLat: number;
  _orbitLon: number;
  _orbitR: number;
  _phase: number;
  _angVel: number;
}

interface ThreatTemplate {
  markerKey: string;
  labels: string[];
  summaries: string[];
  basePriority: ThreatPriority;
}

const THREAT_LIBRARY: ThreatTemplate[] = [
  {
    markerKey: 'convoy',
    labels: ['vehicle convoy', 'armored column', 'logistics column'],
    summaries: [
      '4 vehicles in column formation, ~12 m spacing — consistent with a moving convoy.',
      '3 tracked vehicles detected on unpaved route, low thermal bloom — armored column likely.',
      'Vehicle cluster advancing along grid corridor, uniform spacing — supply column.',
    ],
    basePriority: 'high',
  },
  {
    markerKey: 'aircraft',
    labels: ['aircraft on apron', 'rotary-wing aircraft', 'fixed-wing on runway'],
    summaries: [
      'Single fixed-wing airframe on runway threshold — engines cold, parked.',
      'Rotary-wing platform on apron, rotor static — staged for launch.',
      'Two airframes detected near hangar line — unscheduled presence.',
    ],
    basePriority: 'critical',
  },
  {
    markerKey: 'personnel',
    labels: ['personnel cluster', 'foot patrol', 'dismounted group'],
    summaries: [
      'Cluster of 6–8 personnel near perimeter fence line, slow movement.',
      'Dismounted group transiting open ground toward sector boundary.',
      'Small foot patrol pattern detected along the wadi edge.',
    ],
    basePriority: 'medium',
  },
  {
    markerKey: 'anomaly',
    labels: ['unclassified heat signature', 'unknown contact', 'anomalous structure'],
    summaries: [
      'Heat signature with no matching watch marker — flagged for operator review.',
      'Unknown contact, low confidence — recommend recon overflight.',
      'Anomalous structure not in baseline imagery — possible new emplacement.',
    ],
    basePriority: 'low',
  },
];

class SwarmSimulation {
  private drones: SimDrone[] = [];
  private threats: Threat[] = [];
  private markers: WatchMarker[] = [];
  private telemetry: TelemetrySample[] = [];
  private events: SystemEvent[] = [];

  private startedAt = Date.now();
  private lastTick = Date.now();
  private lastTelemetry = 0;
  private lastSpawn = 0;
  private framesAnalyzed = 0;
  private neutralizedToday = 0;
  private spawnEverySec = 11;

  constructor() {
    this.seedMarkers();
    this.seedDrones();
    this.pushEvent('info', 'CMD', `${AO_CODENAME} command link established. Swarm online.`);
  }

  private seedMarkers() {
    const seed: Array<[string, ThreatPriority]> = [
      ['Armored vehicle convoy in open terrain', 'high'],
      ['Unauthorized aircraft on runway or apron', 'critical'],
      ['Personnel movement near perimeter', 'medium'],
    ];
    this.markers = seed.map(([description, priority], i) => ({
      id: i === 0 ? 'mk-convoy' : i === 1 ? 'mk-aircraft' : 'mk-personnel',
      description,
      priority,
      active: true,
      matches: 0,
      createdAt: Date.now(),
    }));
  }

  private markerKeyFor(markerId: string | null): string {
    if (markerId === 'mk-convoy') return 'convoy';
    if (markerId === 'mk-aircraft') return 'aircraft';
    if (markerId === 'mk-personnel') return 'personnel';
    return 'anomaly';
  }

  private seedDrones() {
    const recon = 5;
    const interceptors = 2;
    for (let i = 0; i < recon; i++) {
      const oLat = AO_CENTER.lat + rand(-0.07, 0.07);
      const oLon = AO_CENTER.lon + rand(-0.07, 0.07);
      const r = rand(0.02, 0.05);
      const phase = rand(0, Math.PI * 2);
      this.drones.push({
        id: uid('drn'),
        callsign: `RAVEN-${i + 1}`,
        role: 'recon',
        status: 'patrolling',
        lat: oLat + r * Math.sin(phase),
        lon: oLon + r * Math.cos(phase),
        altitude: Math.round(rand(380, 620)),
        battery: Math.round(rand(72, 99)),
        signal: Math.round(rand(82, 99)),
        speedKmh: Math.round(rand(45, 70)),
        headingDeg: Math.round(rand(0, 359)),
        assignedThreatId: null,
        _orbitLat: oLat,
        _orbitLon: oLon,
        _orbitR: r,
        _phase: phase,
        _angVel: rand(0.05, 0.12) * (Math.random() > 0.5 ? 1 : -1),
      });
    }
    for (let i = 0; i < interceptors; i++) {
      const oLat = AO_CENTER.lat + rand(-0.03, 0.03);
      const oLon = AO_CENTER.lon + rand(-0.03, 0.03);
      const r = rand(0.012, 0.025);
      const phase = rand(0, Math.PI * 2);
      this.drones.push({
        id: uid('drn'),
        callsign: `LANCE-${i + 1}`,
        role: 'interceptor',
        status: 'patrolling',
        lat: oLat + r * Math.sin(phase),
        lon: oLon + r * Math.cos(phase),
        altitude: Math.round(rand(300, 450)),
        battery: Math.round(rand(80, 100)),
        signal: Math.round(rand(85, 99)),
        speedKmh: Math.round(rand(60, 90)),
        headingDeg: Math.round(rand(0, 359)),
        assignedThreatId: null,
        _orbitLat: oLat,
        _orbitLon: oLon,
        _orbitR: r,
        _phase: phase,
        _angVel: rand(0.04, 0.09) * (Math.random() > 0.5 ? 1 : -1),
      });
    }
  }

  private pushEvent(level: SystemEvent['level'], source: string, message: string) {
    this.events.unshift({ id: uid('ev'), t: Date.now(), level, source, message });
    if (this.events.length > 60) this.events.length = 60;
  }

  private freeInterceptor(): SimDrone | null {
    return (
      this.drones.find(
        (d) => d.role === 'interceptor' && d.status === 'patrolling' && !d.assignedThreatId,
      ) ?? null
    );
  }

  // ─── core tick ──────────────────────────────────────────────────────────
  private tick() {
    const now = Date.now();
    const dt = clamp((now - this.lastTick) / 1000, 0, 3);
    this.lastTick = now;

    // move drones
    for (const d of this.drones) {
      if (d.status === 'offline') continue;

      if (d.status === 'intercepting' && d.assignedThreatId) {
        const tgt = this.threats.find((t) => t.id === d.assignedThreatId);
        if (tgt) {
          const dLat = tgt.lat - d.lat;
          const dLon = tgt.lon - d.lon;
          const dist = Math.hypot(dLat, dLon);
          d.headingDeg = Math.round(((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360);
          if (dist < 0.004) {
            // reached target → neutralize
            tgt.status = 'neutralized';
            this.neutralizedToday += 1;
            this.pushEvent('success', d.callsign, `Target ${tgt.gridRef} neutralized — ${tgt.label}.`);
            d.assignedThreatId = null;
            d.status = 'returning';
          } else {
            const step = (d.speedKmh / 3600) * dt * 0.9; // deg approx
            d.lat += (dLat / dist) * Math.min(step, dist);
            d.lon += (dLon / dist) * Math.min(step, dist);
          }
        } else {
          d.assignedThreatId = null;
          d.status = 'returning';
        }
      } else if (d.status === 'returning') {
        const dLat = d._orbitLat - d.lat;
        const dLon = d._orbitLon - d.lon;
        const dist = Math.hypot(dLat, dLon);
        if (dist < 0.006) {
          d.status = 'patrolling';
        } else {
          const step = (d.speedKmh / 3600) * dt * 0.9;
          d.lat += (dLat / dist) * Math.min(step, dist);
          d.lon += (dLon / dist) * Math.min(step, dist);
        }
      } else {
        // patrol orbit
        d._phase += d._angVel * dt;
        d.lat = d._orbitLat + d._orbitR * Math.sin(d._phase);
        d.lon = d._orbitLon + d._orbitR * Math.cos(d._phase);
        d.headingDeg = Math.round(((d._phase * 180) / Math.PI + (d._angVel > 0 ? 90 : -90) + 360) % 360);
      }

      // battery / signal drift
      const drain = d.status === 'intercepting' ? 0.05 : 0.02;
      d.battery = clamp(d.battery - drain * dt, 35, 100);
      if (d.status === 'returning' && d.battery < 99) d.battery = clamp(d.battery + 0.4 * dt, 0, 100);
      d.signal = clamp(d.signal + rand(-1.5, 1.5), 60, 100);
      d.altitude = clamp(d.altitude + rand(-4, 4), 250, 700);

      if (d.battery < 45 && d.status === 'patrolling' && Math.random() < 0.01) {
        this.pushEvent('warn', d.callsign, `Battery at ${Math.round(d.battery)}% — RTB advised.`);
      }
    }

    // spawn threats
    const elapsed = (now - this.startedAt) / 1000;
    if (elapsed - this.lastSpawn > this.spawnEverySec && this.activeThreatCount() < 5) {
      this.lastSpawn = elapsed;
      this.spawnThreat();
    }

    // advance threat lifecycle
    for (const t of this.threats) {
      const age = (now - t.createdAt) / 1000;
      if (t.status === 'detected' && age > 2.5) {
        if (t.confidence >= 70) {
          t.status = 'confirmed';
          this.pushEvent('threat', 'AI-CORE', `CONFIRMED: ${t.label} @ ${t.gridRef} (${t.confidence}%).`);
          const lance = this.freeInterceptor();
          if (lance && (t.priority === 'high' || t.priority === 'critical')) {
            lance.assignedThreatId = t.id;
            lance.status = 'intercepting';
            t.status = 'intercepting';
            t.detectedBy = lance.callsign;
            this.pushEvent('info', lance.callsign, `Vectoring to intercept ${t.gridRef}.`);
          }
        } else if (age > 8) {
          t.status = 'dismissed';
          this.pushEvent('info', 'AI-CORE', `Contact @ ${t.gridRef} dismissed — below threshold.`);
        }
      }
    }

    // prune old resolved threats
    this.threats = this.threats.filter((t) => {
      const age = (now - t.createdAt) / 1000;
      if ((t.status === 'neutralized' || t.status === 'dismissed') && age > 18) return false;
      return true;
    });

    // telemetry sampling
    if (now - this.lastTelemetry > 1500) {
      this.lastTelemetry = now;
      this.framesAnalyzed += Math.round(rand(3, 9));
      const active = this.drones.filter((d) => d.status !== 'offline').length;
      this.telemetry.push({
        t: now,
        label: hhmmss(now),
        throughputMbps: Math.round(rand(180, 340) + active * 12),
        activeDrones: active,
        detections: this.activeThreatCount(),
        aiLatencyMs: Math.round(rand(420, 920)),
      });
      if (this.telemetry.length > 40) this.telemetry.shift();
    }
  }

  private activeThreatCount() {
    return this.threats.filter(
      (t) => t.status === 'detected' || t.status === 'confirmed' || t.status === 'intercepting',
    ).length;
  }

  private spawnThreat() {
    const activeMarkers = this.markers.filter((m) => m.active);
    // 75% of spawns map to an active marker, else an unmatched anomaly
    const useMarker = activeMarkers.length > 0 && Math.random() < 0.75;
    const marker = useMarker ? pick(activeMarkers) : null;
    const key = this.markerKeyFor(marker?.id ?? null);
    const tpl = THREAT_LIBRARY.find((x) => x.markerKey === key) ?? THREAT_LIBRARY[3];

    const lat = AO_CENTER.lat + rand(-AO_RADIUS_DEG * 0.8, AO_RADIUS_DEG * 0.8);
    const lon = AO_CENTER.lon + rand(-AO_RADIUS_DEG * 0.8, AO_RADIUS_DEG * 0.8);
    const recon = pick(this.drones.filter((d) => d.role === 'recon')) ?? this.drones[0];
    const confidence = useMarker ? Math.round(rand(68, 96)) : Math.round(rand(40, 66));

    const threat: Threat = {
      id: uid('thr'),
      label: pick(tpl.labels),
      matchedMarkerId: marker?.id ?? null,
      confidence,
      priority: tpl.basePriority,
      status: 'detected',
      lat,
      lon,
      gridRef: gridRef(lat, lon),
      detectedBy: recon.callsign,
      imageRef: `FRAME-${String(Math.floor(rand(100, 9999))).padStart(4, '0')}`,
      aiSummary: pick(tpl.summaries),
      createdAt: Date.now(),
    };
    this.threats.unshift(threat);
    if (marker) marker.matches += 1;
    this.framesAnalyzed += 1;
    this.pushEvent(
      'info',
      recon.callsign,
      `New contact @ ${threat.gridRef} — running AI match (${threat.imageRef}).`,
    );
  }

  // ─── public API ───────────────────────────────────────────────────────────
  addMarker(description: string, priority: ThreatPriority): WatchMarker {
    const marker: WatchMarker = {
      id: uid('mk'),
      description,
      priority,
      active: true,
      matches: 0,
      createdAt: Date.now(),
    };
    this.markers.unshift(marker);
    this.pushEvent('info', 'CMD', `Watch marker armed: "${description}".`);
    return marker;
  }

  toggleMarker(id: string) {
    const m = this.markers.find((x) => x.id === id);
    if (m) {
      m.active = !m.active;
      this.pushEvent('info', 'CMD', `Watch marker ${m.active ? 'armed' : 'disarmed'}: "${m.description}".`);
    }
  }

  removeMarker(id: string) {
    const m = this.markers.find((x) => x.id === id);
    this.markers = this.markers.filter((x) => x.id !== id);
    if (m) this.pushEvent('info', 'CMD', `Watch marker removed: "${m.description}".`);
  }

  snapshot(): CommandSnapshot {
    this.tick();
    const active = this.drones.filter((d) => d.status !== 'offline').length;
    return {
      status: {
        aiEngine: 'online',
        aoCodename: AO_CODENAME,
        totalDrones: this.drones.length,
        activeDrones: active,
        activeThreats: this.activeThreatCount(),
        neutralizedToday: this.neutralizedToday,
        framesAnalyzed: this.framesAnalyzed,
        uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      },
      drones: this.drones.map((d) => ({ ...d })),
      threats: [...this.threats],
      markers: [...this.markers],
      telemetry: [...this.telemetry],
      events: [...this.events],
    };
  }
}

// Module-level singleton — survives React re-renders and query polls.
let sim: SwarmSimulation | null = null;
function getSim(): SwarmSimulation {
  if (!sim) sim = new SwarmSimulation();
  return sim;
}

export const simEngine = {
  snapshot: () => getSim().snapshot(),
  addMarker: (description: string, priority: ThreatPriority) => getSim().addMarker(description, priority),
  toggleMarker: (id: string) => getSim().toggleMarker(id),
  removeMarker: (id: string) => getSim().removeMarker(id),
};
