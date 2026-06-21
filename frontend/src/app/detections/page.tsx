'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { fetchDetections, frameUrl } from '@/lib/api';
import type { DetectionPage, DetectionRecord, ThreatPriority } from '@/lib/types';

const PAGE_SIZE = 20;
const PRIORITIES: Array<ThreatPriority | 'all'> = ['all', 'critical', 'high', 'medium', 'low'];

const PRIORITY_CLASS: Record<string, string> = {
  critical: 'text-threat border-threat/40 bg-threat/10',
  high: 'text-warn border-warn/40 bg-warn/10',
  medium: 'text-cyan border-cyan/40 bg-cyan/10',
  low: 'text-ink-dim border-edge-2 bg-panel-2',
};

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString()} ${d.toTimeString().slice(0, 8)}`;
}

export default function DetectionLog() {
  const [page, setPage] = useState(1);
  const [priority, setPriority] = useState<ThreatPriority | 'all'>('all');

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery<DetectionPage>({
    queryKey: ['detections', page, priority],
    queryFn: () => fetchDetections(page, PAGE_SIZE, priority === 'all' ? undefined : priority),
    placeholderData: keepPreviousData,
  });

  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-void bg-grid text-ink">
      {/* header */}
      <header className="flex items-center justify-between gap-4 border-b border-edge bg-panel/80 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-cyan" />
          <div className="leading-tight">
            <h1 className="font-mono text-sm font-semibold tracking-[0.2em] text-ink">
              DETECTION LOG
            </h1>
            <p className="font-mono text-[10px] tracking-wide text-ink-faint">
              PERSISTED AI AUDIT TRAIL · DATABASE-BACKED
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded border border-edge-2 px-2 py-1 font-mono text-[10px] tracking-widest text-ink-dim transition-colors hover:border-cyan/40 hover:text-cyan"
        >
          <ArrowLeft className="h-3 w-3" /> COMMAND
        </Link>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        {/* controls */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPriority(p);
                  setPage(1);
                }}
                className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  priority === p
                    ? 'border-cyan/50 bg-cyan/10 text-cyan'
                    : 'border-edge text-ink-dim hover:border-edge-2 hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="font-mono text-[11px] text-ink-dim">
            {data ? (
              <>
                <span className="text-cyan tabular-nums">{data.total.toLocaleString()}</span> records ·
                page <span className="text-ink tabular-nums">{data.page}</span> / {totalPages.toLocaleString()}
              </>
            ) : (
              'loading…'
            )}
          </div>
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-lg border border-edge bg-panel/60">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge bg-panel-2 font-mono text-[9px] uppercase tracking-widest text-ink-faint">
                <Th>Frame</Th>
                <Th>Time</Th>
                <Th>Label</Th>
                <Th className="text-right">Conf</Th>
                <Th>Priority</Th>
                <Th>Grid</Th>
                <Th>Drone</Th>
                <Th>Source</Th>
                <Th>AI summary</Th>
              </tr>
            </thead>
            <tbody className={isPlaceholderData ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center font-mono text-xs text-ink-dim">
                    loading detection log…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={9} className="p-8 text-center font-mono text-xs text-threat">
                    {(error as Error)?.message ?? 'failed to load detections'}
                  </td>
                </tr>
              )}
              {data?.items.map((d) => (
                <Row key={d.id} d={d} />
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center font-mono text-xs text-ink-dim">
                    no detections for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded border border-edge px-3 py-1.5 font-mono text-[11px] tracking-widest text-ink-dim transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> PREV
          </button>
          <div className="font-mono text-[11px] tabular-nums text-ink-dim">
            page <span className="text-cyan">{page}</span> of {totalPages.toLocaleString()}
          </div>
          <button
            onClick={() => setPage((p) => (data && p < totalPages ? p + 1 : p))}
            disabled={!data || page >= totalPages}
            className="flex items-center gap-1 rounded border border-edge px-3 py-1.5 font-mono text-[11px] tracking-widest text-ink-dim transition-colors hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-30"
          >
            NEXT <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </main>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>;
}

function Row({ d }: { d: DetectionRecord }) {
  const img = frameUrl(d.imageRef);
  return (
    <tr className="border-b border-edge/50 font-mono text-[11px] text-ink-dim transition-colors hover:bg-panel-2/50">
      <td className="px-3 py-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={d.imageRef}
            className="h-10 w-16 rounded border border-edge object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
          />
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-faint">{fmtTime(d.createdAt)}</td>
      <td className="px-3 py-2 text-ink">{d.label}</td>
      <td className="px-3 py-2 text-right tabular-nums text-cyan">{d.confidence}%</td>
      <td className="px-3 py-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${
            PRIORITY_CLASS[d.priority] ?? PRIORITY_CLASS.low
          }`}
        >
          {d.priority}
        </span>
      </td>
      <td className="px-3 py-2 tabular-nums">{d.gridRef}</td>
      <td className="px-3 py-2">{d.detectedBy}</td>
      <td className="px-3 py-2">
        <span className={d.source === 'minimax-m3' ? 'text-signal' : 'text-warn'}>{d.source}</span>
      </td>
      <td className="max-w-md px-3 py-2 text-ink-faint">{d.aiSummary}</td>
    </tr>
  );
}
