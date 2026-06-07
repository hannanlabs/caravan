'use client';

import type { NationData } from '../../lib/spacetimedb-server';

export function MetricsCard({ myNation }: { myNation?: NationData }) {
  const eduPct = myNation ? Math.round(myNation.education * 100) : 0;
  const healthPct = myNation ? Math.round(myNation.health * 100) : 0;
  const taxPct = myNation ? Math.round(myNation.taxRate * 100) : 0;

  return (
    <div className="card">
      <div className="card-title">Other Metrics</div>
      <MetricRow label="Military" value={null} note="future" />
      <MetricRow label="Technology" value={null} note="future" />
      <MetricRow label="Education" value={eduPct} note={`raw: ${myNation?.education.toFixed(3) ?? '—'}`} />
      <MetricRow label="Health" value={healthPct} note={`raw: ${myNation?.health.toFixed(3) ?? '—'}`} />
      <MetricRow label="Tax Rate" value={taxPct} note={`raw: ${myNation?.taxRate.toFixed(3) ?? '—'}`} />
    </div>
  );
}

function MetricRow({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <div className="metric-row">
      <div style={{ flex: '0 0 90px', fontSize: 12, color: '#8b96b0' }}>{label}</div>
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: value === null ? '0%' : `${value}%` }} />
      </div>
      <div className="metric-value">{value === null ? '—' : value}</div>
      <div style={{ flex: '0 0 70px', fontSize: 10, color: '#5a6580', textAlign: 'right' }}>{note}</div>
    </div>
  );
}
