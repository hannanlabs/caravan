'use client';

import type React from 'react';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.08, color: '#8b96b0', textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#5a6580', fontStyle: 'italic', fontSize: 13, padding: '4px 0' }}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#8b96b0', textTransform: 'uppercase', letterSpacing: 0.05 }}>{label}</span>
      {children}
    </label>
  );
}

export function ProgressBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div style={{ flex: 1, height: 8, background: '#1f2940', borderRadius: 4, marginLeft: 12, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value * 100)}%`, background: accent }} />
    </div>
  );
}

export function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot neutral">{foot}</div>}
    </div>
  );
}

export const modalInputStyle: React.CSSProperties = {
  background: '#0a0e1a',
  border: '1px solid #2a3550',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#e5eaf2',
  width: '100%',
  fontSize: 13,
};

export const primaryButton: React.CSSProperties = {
  background: '#2ed573',
  border: 'none',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#0a0e1a',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
};

export const secondaryButton: React.CSSProperties = {
  background: '#1a2138',
  border: '1px solid #2a3550',
  borderRadius: 6,
  padding: '6px 12px',
  color: '#e5eaf2',
  fontSize: 12,
  cursor: 'pointer',
};

export const approveButton: React.CSSProperties = {
  background: '#2ed573',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  color: '#0a0e1a',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 12,
};

export const rejectButton: React.CSSProperties = {
  background: '#ff4757',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 12,
};

export const offerRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  background: '#0a0e1a',
  border: '1px solid #1f2940',
  borderRadius: 6,
};
