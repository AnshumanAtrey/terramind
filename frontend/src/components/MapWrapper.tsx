'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import type { Drone, Threat } from '@/lib/types';

// Leaflet touches `window`, so the map must never render on the server.
const TacticalMap = dynamic(() => import('./TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-void">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-faint">
        <Loader2 className="h-4 w-4 animate-spin text-cyan" />
        ACQUIRING SATELLITE IMAGERY…
      </div>
    </div>
  ),
});

export function MapWrapper({ drones, threats }: { drones: Drone[]; threats: Threat[] }) {
  return <TacticalMap drones={drones} threats={threats} />;
}
