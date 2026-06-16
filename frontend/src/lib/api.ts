// ─── Data layer ────────────────────────────────────────────────────────────
// One seam between the UI and its data source.
//   • NEXT_PUBLIC_API_URL set  → talk to the FastAPI backend.
//   • unset, or backend errors → fall back to the in-browser simulation.
// The fallback is intentional: if the backend pod is killed during the chaos /
// disaster-recovery demo, the console keeps running in "degraded mode".

import { simEngine } from './mockData';
import { CommandSnapshot, ThreatPriority, WatchMarker } from './types';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

export interface FetchResult {
  snapshot: CommandSnapshot;
  source: 'backend' | 'simulation';
  degraded: boolean; // backend was expected but unreachable
}

async function tryBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchSnapshot(): Promise<FetchResult> {
  if (!API) {
    return { snapshot: simEngine.snapshot(), source: 'simulation', degraded: false };
  }
  try {
    const snapshot = await tryBackend<CommandSnapshot>('/api/command/snapshot');
    return { snapshot, source: 'backend', degraded: false };
  } catch {
    // backend was configured but is unreachable → degraded mode
    const snapshot = simEngine.snapshot();
    snapshot.status.aiEngine = 'degraded';
    return { snapshot, source: 'simulation', degraded: true };
  }
}

export async function addWatchMarker(
  description: string,
  priority: ThreatPriority,
): Promise<WatchMarker> {
  if (API) {
    try {
      return await tryBackend<WatchMarker>('/api/markers', {
        method: 'POST',
        body: JSON.stringify({ description, priority }),
      });
    } catch {
      /* fall through to sim */
    }
  }
  return simEngine.addMarker(description, priority);
}

export async function toggleWatchMarker(id: string): Promise<void> {
  if (API) {
    try {
      await tryBackend(`/api/markers/${id}/toggle`, { method: 'POST' });
      return;
    } catch {
      /* fall through */
    }
  }
  simEngine.toggleMarker(id);
}

export async function removeWatchMarker(id: string): Promise<void> {
  if (API) {
    try {
      await tryBackend(`/api/markers/${id}`, { method: 'DELETE' });
      return;
    } catch {
      /* fall through */
    }
  }
  simEngine.removeMarker(id);
}
