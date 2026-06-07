'use client';

interface DebugStripProps {
  isActive: boolean;
  worldReady: boolean;
  nationsReady: boolean;
  identity?: { toHexString(): string };
  worldCount: number;
  nationCount: number;
  tradeCount: number;
  trustCount: number;
}

export function DebugStrip({
  isActive, worldReady, nationsReady, identity, worldCount, nationCount, tradeCount, trustCount,
}: DebugStripProps) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 14px',
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        color: 'var(--ink-2)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? 'var(--pos)' : 'var(--neg)' }} />
        WS: <strong style={{ color: isActive ? 'var(--pos)' : 'var(--neg)' }}>{isActive ? 'connected' : 'disconnected'}</strong>
      </span>
      <span>identity: {identity ? identity.toHexString().slice(0, 12) + '…' : '(none)'}</span>
      <span>world: {worldCount}{worldReady ? '' : ' (waiting)'}</span>
      <span>nations: {nationCount}{nationsReady ? '' : ' (waiting)'}</span>
      <span>trade_offer: {tradeCount}</span>
      <span>trust: {trustCount}</span>
    </div>
  );
}
