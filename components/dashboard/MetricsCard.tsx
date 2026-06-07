'use client';

import type { NationData } from '../../lib/spacetimedb-server';

export function MetricsCard({ myNation }: { myNation?: NationData }) {
  const rows: { label: string; value: number | null; future?: boolean }[] = [
    { label: 'Military', value: null, future: true },
    { label: 'Technology', value: null, future: true },
    { label: 'Education', value: myNation ? Math.round(myNation.education * 100) : 0 },
    { label: 'Health', value: myNation ? Math.round(myNation.health * 100) : 0 },
    { label: 'Tax rate', value: myNation ? Math.round(myNation.taxRate * 100) : 0 },
  ];

  return (
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 10 }}>
        <span className="ct-label">Metrics</span>
      </div>
      {rows.map((r) => (
        <div className="mrow" key={r.label}>
          <span className="m-label">{r.label}</span>
          {r.future ? (
            <>
              <span className="m-future">Coming soon</span>
              <span />
            </>
          ) : (
            <>
              <div className="bar"><i style={{ width: `${r.value ?? 0}%` }} /></div>
              <span className="m-val tnum">{r.value}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
