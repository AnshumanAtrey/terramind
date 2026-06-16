'use client';

import { Terminal } from 'lucide-react';
import type { SystemEvent } from '@/lib/types';
import { EVENT_COLOR } from '@/lib/ui';

export function EventLog({ events }: { events: SystemEvent[] }) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border border-edge bg-panel/70">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-ink-faint" />
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ink-dim">
          EVENT LOG
        </h2>
        <span className="ml-auto flex items-center gap-1 font-mono text-[9px] tracking-widest text-signal">
          <span className="h-1.5 w-1.5 animate-flicker rounded-full bg-signal" /> STREAMING
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed">
        {events.map((e) => (
          <div key={e.id} className="flex gap-2 py-px">
            <span className="shrink-0 text-ink-faint">{new Date(e.t).toTimeString().slice(0, 8)}</span>
            <span
              className="shrink-0 font-semibold"
              style={{ color: EVENT_COLOR[e.level] }}
            >
              {e.source.padEnd(8, ' ')}
            </span>
            <span className="text-ink-dim">{e.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
