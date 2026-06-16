'use client';

import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
  sub?: string;
}

export function StatCard({ icon: Icon, label, value, accent = '#22d3ee', sub }: Props) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-edge bg-panel/70 px-3 py-2.5">
      <div
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-widest text-ink-faint">{label}</span>
        <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-semibold tabular-nums text-ink">{value}</span>
        {sub && <span className="font-mono text-[10px] text-ink-faint">{sub}</span>}
      </div>
    </div>
  );
}
