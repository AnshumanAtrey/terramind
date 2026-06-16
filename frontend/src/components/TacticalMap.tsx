'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, Circle, Polyline } from 'react-leaflet';
import type { Drone, Threat } from '@/lib/types';
import { AO_CENTER, AO_RADIUS_DEG } from '@/lib/mockData';
import { frameUrl } from '@/lib/api';
import { DRONE_STATUS_COLOR, PRIORITY_COLOR, THREAT_STATUS_COLOR } from '@/lib/ui';

interface Props {
  drones: Drone[];
  threats: Threat[];
}

const ESRI_IMAGERY =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const AO_BOUNDS: [[number, number], [number, number]] = [
  [AO_CENTER.lat - AO_RADIUS_DEG, AO_CENTER.lon - AO_RADIUS_DEG],
  [AO_CENTER.lat + AO_RADIUS_DEG, AO_CENTER.lon + AO_RADIUS_DEG],
];

function droneIcon(d: Drone): L.DivIcon {
  const color = DRONE_STATUS_COLOR[d.status];
  const shape =
    d.role === 'interceptor'
      ? `<path d="M12 2 L20 12 L12 22 L4 12 Z" fill="${color}" stroke="rgba(7,10,15,.9)" stroke-width="1.5"/>`
      : `<path d="M12 3 L19 19 L12 15 L5 19 Z" fill="${color}" stroke="rgba(7,10,15,.9)" stroke-width="1.5"/>`;
  return L.divIcon({
    className: 'tm-marker',
    html: `<div style="transform:rotate(${d.headingDeg}deg);filter:drop-shadow(0 0 4px ${color})">
      <svg width="20" height="20" viewBox="0 0 24 24">${shape}</svg>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function threatIcon(t: Threat): L.DivIcon {
  const color =
    t.status === 'neutralized' || t.status === 'dismissed'
      ? THREAT_STATUS_COLOR[t.status]
      : PRIORITY_COLOR[t.priority];
  const active = t.status === 'detected' || t.status === 'confirmed' || t.status === 'intercepting';
  return L.divIcon({
    className: 'tm-marker',
    html: `<div style="position:relative;color:${color};width:14px;height:14px">
      ${active ? `<div class="tm-threat-ring"></div>` : ''}
      <div class="tm-dot" style="background:${color};box-shadow:0 0 8px ${color}"></div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function TacticalMap({ drones, threats }: Props) {
  const engagements = drones.filter((d) => d.status === 'intercepting' && d.assignedThreatId);

  return (
    <MapContainer
      center={[AO_CENTER.lat, AO_CENTER.lon]}
      zoom={13}
      scrollWheelZoom
      zoomControl
      className="h-full w-full"
      preferCanvas
    >
      <TileLayer
        url={ESRI_IMAGERY}
        attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
        maxZoom={18}
      />

      {/* Area of operations boundary */}
      <Rectangle
        bounds={AO_BOUNDS}
        pathOptions={{ color: '#22d3ee', weight: 1, dashArray: '6 6', fillOpacity: 0.03 }}
      />

      {/* range rings from AO center */}
      {[0.015, 0.03, 0.045].map((r) => (
        <Circle
          key={r}
          center={[AO_CENTER.lat, AO_CENTER.lon]}
          radius={r * 111000}
          pathOptions={{ color: '#22d3ee', weight: 0.5, opacity: 0.25, fill: false }}
        />
      ))}

      {/* engagement vectors: interceptor → target */}
      {engagements.map((d) => {
        const t = threats.find((x) => x.id === d.assignedThreatId);
        if (!t) return null;
        return (
          <Polyline
            key={`eng-${d.id}`}
            positions={[
              [d.lat, d.lon],
              [t.lat, t.lon],
            ]}
            pathOptions={{ color: '#a78bfa', weight: 1, dashArray: '4 4', opacity: 0.8 }}
          />
        );
      })}

      {/* threats */}
      {threats.map((t) => (
        <Marker key={t.id} position={[t.lat, t.lon]} icon={threatIcon(t)}>
          <Popup>
            <div className="font-mono text-[11px] leading-relaxed">
              <div className="mb-1 text-sm font-semibold" style={{ color: PRIORITY_COLOR[t.priority] }}>
                {t.label.toUpperCase()}
              </div>
              <div className="text-ink-dim">GRID {t.gridRef} · {t.confidence}% conf · {t.status.toUpperCase()}</div>
              {frameUrl(t.imageRef) && (
                <div className="mt-1.5">
                  <div className="mb-0.5 text-[9px] tracking-widest text-cyan">◉ SENSOR FRAME — AI ANALYZED</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frameUrl(t.imageRef)}
                    alt={t.imageRef}
                    className="w-full max-w-[240px] rounded border border-edge-2"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="mt-1 max-w-[240px] text-ink">{t.aiSummary}</div>
              <div className="mt-1 text-ink-faint">src {t.detectedBy} · {t.imageRef}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* drones */}
      {drones.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lon]} icon={droneIcon(d)}>
          <Popup>
            <div className="font-mono text-[11px] leading-relaxed">
              <div className="mb-1 text-sm font-semibold text-cyan">{d.callsign}</div>
              <div className="text-ink-dim">
                {d.role.toUpperCase()} · {d.status.toUpperCase()}
              </div>
              <div className="mt-1 text-ink">
                ALT {d.altitude}m · BAT {Math.round(d.battery)}% · SIG {Math.round(d.signal)}%
              </div>
              <div className="text-ink-faint">
                {d.speedKmh} km/h · HDG {d.headingDeg}°
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
