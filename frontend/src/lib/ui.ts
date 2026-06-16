// Shared display helpers / colour maps for the command console.

import type { DroneStatus, EventLevel, ThreatPriority, ThreatStatus } from './types';

export const PRIORITY_COLOR: Record<ThreatPriority, string> = {
  low: '#8aa0b2',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f43f5e',
};

export const PRIORITY_LABEL: Record<ThreatPriority, string> = {
  low: 'LOW',
  medium: 'MED',
  high: 'HIGH',
  critical: 'CRIT',
};

export const DRONE_STATUS_COLOR: Record<DroneStatus, string> = {
  patrolling: '#34d399',
  investigating: '#22d3ee',
  intercepting: '#a78bfa',
  returning: '#fbbf24',
  offline: '#52647a',
};

export const THREAT_STATUS_COLOR: Record<ThreatStatus, string> = {
  detected: '#fbbf24',
  confirmed: '#f43f5e',
  intercepting: '#a78bfa',
  neutralized: '#34d399',
  dismissed: '#52647a',
};

export const EVENT_COLOR: Record<EventLevel, string> = {
  info: '#8aa0b2',
  warn: '#fbbf24',
  threat: '#f43f5e',
  success: '#34d399',
};

export function timeAgo(t: number): string {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

export function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
