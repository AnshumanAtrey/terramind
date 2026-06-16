'use client';

import { Radar, Wifi, WifiOff, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SystemStatus } from '@/lib/types';
import { fmtUptime } from '@/lib/ui';

interface Props {
  status: SystemStatus | null;
  source: 'backend' | 'simulation';
  degraded: boolean;
}

export function Header({ status, source, degraded }: Props) {
  const [clock, setClock] = useState('--:--:--');
  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ai = status?.aiEngine ?? 'offline';
  const aiColor = ai === 'online' ? 'text-signal' : ai === 'degraded' ? 'text-warn' : 'text-threat';

  return (
    <header className="flex items-center justify-between gap-4 border-b border-edge bg-panel/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="relative grid h-9 w-9 place-items-center rounded-md border border-cyan/40 bg-cyan/5">
          <Radar className="h-5 w-5 text-cyan" />
          <span className="absolute inset-0 origin-center animate-sweep">
            <span className="absolute left-1/2 top-1/2 h-[1px] w-3.5 -translate-y-1/2 bg-gradient-to-r from-cyan to-transparent" />
          </span>
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm font-semibold tracking-[0.2em] text-ink">TERRAMIND</h1>
            <span className="rounded border border-edge-2 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-ink-dim">
              CS-124
            </span>
          </div>
          <p className="font-mono text-[10px] tracking-wide text-ink-faint">
            DRONE SWARM COMMAND · GEOSPATIAL INTELLIGENCE
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Stat label="AO" value={status?.aoCodename ?? '—'} />
        <Divider />
        <Stat label="SWARM" value={`${status?.activeDrones ?? 0}/${status?.totalDrones ?? 0}`} />
        <Divider />
        <Stat
          label="THREATS"
          value={String(status?.activeThreats ?? 0)}
          valueClass={status && status.activeThreats > 0 ? 'text-threat' : 'text-ink'}
        />
        <Divider />
        <Stat label="UPLINK" value={fmtUptime(status?.uptimeSec ?? 0)} />
        <Divider />

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 font-mono text-[11px] ${aiColor}`}>
            {ai === 'offline' ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
            <span className="tracking-widest">AI·{ai.toUpperCase()}</span>
          </div>
          {degraded && (
            <span className="flex items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-warn">
              <ShieldAlert className="h-3 w-3" /> DEGRADED
            </span>
          )}
          <span className="rounded border border-edge-2 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-ink-faint">
            {source === 'backend' ? 'LIVE' : 'SIM'}
          </span>
        </div>

        <div className="font-mono text-sm tabular-nums text-cyan">{clock}</div>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  valueClass = 'text-ink',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="leading-tight">
      <div className="font-mono text-[9px] tracking-widest text-ink-faint">{label}</div>
      <div className={`font-mono text-xs font-semibold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

function Divider() {
  return <span className="h-6 w-px bg-edge" />;
}
