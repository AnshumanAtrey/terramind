'use client';

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from 'recharts';
import type { TelemetrySample } from '@/lib/types';

export function TelemetryChart({ telemetry }: { telemetry: TelemetrySample[] }) {
  const latest = telemetry[telemetry.length - 1];

  return (
    <section className="flex h-full flex-col rounded-lg border border-edge bg-panel/70">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-ink-dim">
          TELEMETRY
        </h2>
        <div className="flex items-center gap-3 font-mono text-[10px] tabular-nums">
          <span className="text-ink-faint">
            THRPT <span className="text-cyan">{latest?.throughputMbps ?? 0}</span> Mbps
          </span>
          <span className="text-ink-faint">
            AI <span className="text-intercept">{latest?.aiLatencyMs ?? 0}</span> ms
          </span>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-1 p-2">
        <div className="flex min-h-0 flex-col">
          <Label text="DOWNLINK THROUGHPUT" />
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="thrpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                <Tooltip content={<TinyTooltip unit="Mbps" k="throughputMbps" />} />
                <Area
                  type="monotone"
                  dataKey="throughputMbps"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  fill="url(#thrpt)"
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <Label text="AI INFERENCE LATENCY" />
          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
                <YAxis hide domain={['dataMin - 50', 'dataMax + 50']} />
                <Tooltip content={<TinyTooltip unit="ms" k="aiLatencyMs" />} />
                <Line
                  type="monotone"
                  dataKey="aiLatencyMs"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  isAnimationActive={false}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div className="px-1 font-mono text-[8px] tracking-widest text-ink-faint">{text}</div>
  );
}

function TinyTooltip({
  active,
  payload,
  unit,
  k,
}: {
  active?: boolean;
  payload?: Array<{ payload: TelemetrySample }>;
  unit: string;
  k: 'throughputMbps' | 'aiLatencyMs';
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded border border-edge-2 bg-void/90 px-2 py-1 font-mono text-[10px] text-ink">
      <span className="text-ink-faint">{p.label}</span> · {p[k]} {unit}
    </div>
  );
}
