'use client';

import { AlertTriangle, Crosshair, CheckCircle2, ScanLine } from 'lucide-react';
import type { Threat } from '@/lib/types';
import { PRIORITY_COLOR, PRIORITY_LABEL, THREAT_STATUS_COLOR, timeAgo } from '@/lib/ui';
import { Panel } from './SwarmStatusPanel';

function statusIcon(s: Threat['status']) {
  switch (s) {
    case 'detected':
      return <ScanLine className="h-3.5 w-3.5" />;
    case 'confirmed':
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case 'intercepting':
      return <Crosshair className="h-3.5 w-3.5" />;
    case 'neutralized':
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    default:
      return <ScanLine className="h-3.5 w-3.5" />;
  }
}

export function ThreatFeed({ threats }: { threats: Threat[] }) {
  const ordered = [...threats].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Panel title="AI THREAT FEED" count={threats.length}>
      <div className="flex flex-col gap-1.5">
        {ordered.length === 0 && (
          <p className="px-1 py-3 text-center font-mono text-[10px] text-ink-faint">
            no active contacts — swarm scanning.
          </p>
        )}
        {ordered.map((t) => {
          const sColor = THREAT_STATUS_COLOR[t.status];
          return (
            <div
              key={t.id}
              className="animate-scrollIn rounded border-l-2 border-edge/60 bg-panel-2/40 py-1.5 pl-2.5 pr-2"
              style={{ borderLeftColor: PRIORITY_COLOR[t.priority] }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5" style={{ color: sColor }}>
                  {statusIcon(t.status)}
                  <span className="font-mono text-[11px] font-semibold text-ink">{t.label}</span>
                </div>
                <span
                  className="rounded px-1 py-px font-mono text-[8px] font-bold tracking-widest"
                  style={{ color: PRIORITY_COLOR[t.priority], border: `1px solid ${PRIORITY_COLOR[t.priority]}55` }}
                >
                  {PRIORITY_LABEL[t.priority]}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] tracking-wide text-ink-faint">
                <span>GRID {t.gridRef}</span>
                <span>·</span>
                <span style={{ color: sColor }}>{t.status.toUpperCase()}</span>
                <span>·</span>
                <span>{t.confidence}%</span>
                <span className="ml-auto">{timeAgo(t.createdAt)} ago</span>
              </div>
              <p className="mt-1 line-clamp-2 font-mono text-[10px] leading-snug text-ink-dim">
                {t.aiSummary}
              </p>
              <div className="mt-0.5 font-mono text-[9px] text-ink-faint">
                {t.detectedBy} · {t.imageRef}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
