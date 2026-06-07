'use client';

import type { NationData } from '../../lib/spacetimedb-server';

// Guard against missing/NaN values (e.g. rows from a pre-migration module).
const pct = (v: number) => (Number.isFinite(v) ? Math.round(v * 100) : 0);

export function MetricsCard({ myNation }: { myNation?: NationData }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Military', value: myNation ? pct(myNation.military) : 0 },
    { label: 'Technology', value: myNation ? pct(myNation.technology) : 0 },
    { label: 'Education', value: myNation ? pct(myNation.education) : 0 },
    { label: 'Health', value: myNation ? pct(myNation.health) : 0 },
    { label: 'Tax rate', value: myNation ? pct(myNation.taxRate) : 0 },
  ];

  return (
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 10 }}>
        <span className="ct-label">Metrics</span>
      </div>
      {rows.map((r) => (
        <div className="mrow" key={r.label}>
          <span className="m-label">{r.label}</span>
          <div className="bar"><i style={{ width: `${r.value}%` }} /></div>
          <span className="m-val tnum">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
