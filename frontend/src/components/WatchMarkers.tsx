'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Power, Trash2, Crosshair } from 'lucide-react';
import type { ThreatPriority, WatchMarker } from '@/lib/types';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/ui';
import { addWatchMarker, removeWatchMarker, toggleWatchMarker } from '@/lib/api';
import { Panel } from './SwarmStatusPanel';

const PRIORITIES: ThreatPriority[] = ['low', 'medium', 'high', 'critical'];

export function WatchMarkers({ markers }: { markers: WatchMarker[] }) {
  const qc = useQueryClient();
  const [desc, setDesc] = useState('');
  const [priority, setPriority] = useState<ThreatPriority>('high');
  const [busy, setBusy] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ['command-snapshot'] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = desc.trim();
    if (!value || busy) return;
    setBusy(true);
    await addWatchMarker(value, priority);
    setDesc('');
    await refresh();
    setBusy(false);
  }

  return (
    <Panel title="WATCH MARKERS" count={markers.length}>
      <form onSubmit={submit} className="mb-2 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 rounded border border-edge-2 bg-void/60 px-2 py-1.5 focus-within:border-cyan/50">
          <Crosshair className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="define a target to watch for…"
            className="w-full bg-transparent font-mono text-[11px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded border px-1.5 py-0.5 font-mono text-[9px] tracking-widest transition-colors ${
                priority === p ? 'border-current' : 'border-edge text-ink-faint'
              }`}
              style={priority === p ? { color: PRIORITY_COLOR[p] } : undefined}
            >
              {PRIORITY_LABEL[p]}
            </button>
          ))}
          <button
            type="submit"
            disabled={busy || !desc.trim()}
            className="ml-auto flex items-center gap-1 rounded border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] tracking-widest text-cyan transition-colors hover:bg-cyan/20 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" /> ARM
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-1.5">
        {markers.length === 0 && (
          <p className="px-1 py-3 text-center font-mono text-[10px] text-ink-faint">
            no watch markers — define what the swarm should look for.
          </p>
        )}
        {markers.map((m) => (
          <div
            key={m.id}
            className={`rounded border px-2.5 py-1.5 transition-opacity ${
              m.active ? 'border-edge/60 bg-panel-2/40' : 'border-edge/40 bg-transparent opacity-50'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="rounded px-1 py-px font-mono text-[8px] font-bold tracking-widest"
                    style={{ color: PRIORITY_COLOR[m.priority], border: `1px solid ${PRIORITY_COLOR[m.priority]}55` }}
                  >
                    {PRIORITY_LABEL[m.priority]}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">{m.matches} hits</span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink">{m.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn
                  title={m.active ? 'disarm' : 'arm'}
                  onClick={async () => {
                    await toggleWatchMarker(m.id);
                    refresh();
                  }}
                >
                  <Power className={`h-3 w-3 ${m.active ? 'text-signal' : 'text-ink-faint'}`} />
                </IconBtn>
                <IconBtn
                  title="remove"
                  onClick={async () => {
                    await removeWatchMarker(m.id);
                    refresh();
                  }}
                >
                  <Trash2 className="h-3 w-3 text-ink-faint hover:text-threat" />
                </IconBtn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded border border-transparent hover:border-edge-2 hover:bg-panel-2"
    >
      {children}
    </button>
  );
}
