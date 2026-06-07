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
    <div style={{
      background: isActive ? '#1a3550' : '#5a1a1a',
      border: '1px solid #2a3550',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#e5eaf2',
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <span>WS: <strong style={{ color: isActive ? '#2ed573' : '#ff4757' }}>{isActive ? 'connected' : 'disconnected'}</strong></span>
      <span>identity: {identity ? identity.toHexString().slice(0, 12) + '…' : '(none)'}</span>
      <span>world: {worldCount}{worldReady ? '' : ' (waiting)'}</span>
      <span>nations: {nationCount}{nationsReady ? '' : ' (waiting)'}</span>
      <span>trade_offer: {tradeCount}</span>
      <span>trust: {trustCount}</span>
    </div>
  );
}
