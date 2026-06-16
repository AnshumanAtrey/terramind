'use client';

import { Plane, ShieldAlert, Target, ScanEye, Cpu, Loader2 } from 'lucide-react';
import { useCommandData } from '@/hooks/useCommandData';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { MapWrapper } from '@/components/MapWrapper';
import { WatchMarkers } from '@/components/WatchMarkers';
import { ThreatFeed } from '@/components/ThreatFeed';
import { SwarmStatusPanel } from '@/components/SwarmStatusPanel';
import { TelemetryChart } from '@/components/TelemetryChart';
import { EventLog } from '@/components/EventLog';

export default function CommandConsole() {
  const { snapshot, source, degraded, isLoading } = useCommandData();

  if (!snapshot) {
    return (
      <div className="flex h-screen items-center justify-center bg-void bg-grid">
        <div className="flex items-center gap-3 font-mono text-sm tracking-widest text-ink-dim">
          <Loader2 className="h-5 w-5 animate-spin text-cyan" />
          {isLoading ? 'INITIALIZING COMMAND LINK…' : 'NO SIGNAL'}
        </div>
      </div>
    );
  }

  const { status, drones, threats, markers, telemetry, events } = snapshot;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-void bg-grid">
      <Header status={status} source={source} degraded={degraded} />

      <main className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        {/* KPI row */}
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={Plane}
            label="ACTIVE DRONES"
            value={status.activeDrones}
            sub={`/ ${status.totalDrones}`}
            accent="#34d399"
          />
          <StatCard
            icon={ShieldAlert}
            label="ACTIVE THREATS"
            value={status.activeThreats}
            accent={status.activeThreats > 0 ? '#f43f5e' : '#22d3ee'}
          />
          <StatCard
            icon={Target}
            label="NEUTRALIZED"
            value={status.neutralizedToday}
            sub="today"
            accent="#a78bfa"
          />
          <StatCard
            icon={ScanEye}
            label="FRAMES ANALYZED"
            value={status.framesAnalyzed}
            accent="#22d3ee"
          />
          <StatCard
            icon={Cpu}
            label="AI ENGINE"
            value={status.aiEngine.toUpperCase()}
            accent={status.aiEngine === 'online' ? '#34d399' : degraded ? '#fbbf24' : '#f43f5e'}
          />
        </div>

        {/* map + right rail */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="min-h-0 lg:col-span-8">
            <div className="h-full w-full overflow-hidden rounded-lg border border-edge">
              <MapWrapper drones={drones} threats={threats} />
            </div>
          </div>
          <div className="grid min-h-0 grid-rows-2 gap-2 lg:col-span-4">
            <WatchMarkers markers={markers} />
            <ThreatFeed threats={threats} />
          </div>
        </div>

        {/* bottom strip */}
        <div className="grid h-52 shrink-0 grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="min-h-0 lg:col-span-5">
            <TelemetryChart telemetry={telemetry} />
          </div>
          <div className="min-h-0 lg:col-span-3">
            <SwarmStatusPanel drones={drones} />
          </div>
          <div className="min-h-0 lg:col-span-4">
            <EventLog events={events} />
          </div>
        </div>
      </main>
    </div>
  );
}
