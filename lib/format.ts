import type { Timestamp } from 'spacetimedb';

export function formatMoney(b: bigint): { value: string; unit: string } {
  const n = Number(b);
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(2), unit: 'Trillion' };
  if (n >= 1_000) return { value: (n / 1_000).toFixed(2), unit: 'Billion' };
  return { value: n.toString(), unit: 'Million' };
}

export function formatMoneyShort(b: bigint): string {
  const n = Number(b);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}T`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}B`;
  return `$${n}M`;
}

export function formatGdp(g: number): { value: string; unit: string } {
  if (g >= 1_000_000) return { value: (g / 1_000_000).toFixed(2), unit: 'Trillion' };
  if (g >= 1_000) return { value: (g / 1_000).toFixed(2), unit: 'Billion' };
  return { value: g.toFixed(0), unit: 'Million' };
}

export function formatGdpShort(g: number): string {
  if (g >= 1_000_000) return `$${(g / 1_000_000).toFixed(1)}T`;
  if (g >= 1_000) return `$${(g / 1_000).toFixed(1)}B`;
  return `$${g.toFixed(0)}M`;
}

// Money is denominated in millions ($M). Always show the magnitude unit, e.g. "$58.1M", "$6.0B".
export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return '$0M';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}T`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}B`;
  if (n >= 100) return `$${n.toFixed(0)}M`;
  return `$${n.toFixed(1)}M`;
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '0.0%';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function formatAmount(n: number | bigint): string {
  const v = typeof n === 'bigint' ? Number(n) : n;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return `${Math.round(v)}`;
}

export function rankSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function relativeTime(ts: Timestamp): string {
  const eventMs = Number(ts.microsSinceUnixEpoch / 1000n);
  const diff = Date.now() - eventMs;
  if (diff < 5_000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
