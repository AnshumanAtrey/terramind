'use client';

import { Plane, Crosshair, BatteryMedium, SignalHigh } from 'lucide-react';
import type { Drone } from '@/lib/types';
import { DRONE_STATUS_COLOR } from '@/lib/ui';

export function SwarmStatusPanel({ drones }: { drones: Drone[] }) {
  return (
    <Panel title="SWARM STATUS" count={drones.length}>
      <div className="flex flex-col gap-1.5">
        {drones.map((d) => (
          <div
            key={d.id}
            className="rounded border border-edge/60 bg-panel-2/40 px-2.5 py-2 transition-colors hover:border-edge-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {d.role === 'interceptor' ? (
                  <Crosshair className="h-3.5 w-3.5 text-intercept" />
                ) : (
                  <Plane className="h-3.5 w-3.5 text-cyan" />
                )}
                <span className="font-mono text-[11px] font-semibold text-ink">{d.callsign}</span>
              </div>
              <span
                className="flex items-center gap-1 font-mono text-[9px] tracking-widest"
                style={{ color: DRONE_STATUS_COLOR[d.status] }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: DRONE_STATUS_COLOR[d.status] }}
                />
                {d.status.toUpperCase()}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <Meter icon="bat" value={d.battery} />
              <Meter icon="sig" value={d.signal} />
              <span className="ml-auto font-mono text-[10px] tabular-nums text-ink-faint">
                {d.altitude}m
              </span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Meter({ icon, value }: { icon: 'bat' | 'sig'; value: number }) {
  const v = Math.round(value);
  const color = v > 60 ? '#34d399' : v > 35 ? '#fbbf24' : '#f43f5e';
  return (
    <div className="flex items-center gap-1">
      {icon === 'bat' ? (
        <BatteryMedium className="h-3 w-3 text-ink-faint" />
      ) : (
        <SignalHigh className="h-3 w-3 text-ink-faint" />
      )}
      <div className="h-1 w-10 overflow-hidden rounded-full bg-edge">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-ink-dim">{v}</span>
    </div>
  );
}

export function Panel({
  title,
  count,
  children,
  action,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-edge bg-panel/70">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ink-dim">
            {title}
          </h2>
          {count !== undefined && (
            <span className="rounded bg-edge px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-ink-dim">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </section>
  );
}
