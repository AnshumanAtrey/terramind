'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSnapshot, type FetchResult } from '@/lib/api';

const POLL_MS = 2000;

export function useCommandData() {
  const query = useQuery<FetchResult>({
    queryKey: ['command-snapshot'],
    queryFn: fetchSnapshot,
    refetchInterval: POLL_MS,
  });

  return {
    snapshot: query.data?.snapshot ?? null,
    source: query.data?.source ?? 'simulation',
    degraded: query.data?.degraded ?? false,
    isLoading: query.isLoading,
    error: query.error,
  };
}
