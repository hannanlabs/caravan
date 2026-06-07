'use client';

export interface MoneyPoint { year: number; money: number; }

export function GdpHistoryCard({ history }: { history: MoneyPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="card">
        <div className="card-title">Visualization · GDP over time</div>
        <div className="card-empty" style={{ padding: '12px 0', fontSize: 12 }}>
          Make a move to start tracking history.
        </div>
      </div>
    );
  }
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const delta = last.money - first.money;
  const deltaPct = first.money > 0 ? (delta / first.money) * 100 : 0;
  return (
    <div className="card">
      <div className="card-title">Visualization · GDP over time</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8b96b0' }}>
        <span>Year {first.year.toFixed(2)} → {last.year.toFixed(2)}</span>
        <span style={{ color: delta >= 0 ? '#2ed573' : '#ff4757' }}>
          {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
        </span>
      </div>
      <div style={{ width: '100%' }}>
        <ResponsiveSparkline history={history} height={70} />
      </div>
    </div>
  );
}

function ResponsiveSparkline({ history, height, stroke = '#3742fa' }: {
  history: MoneyPoint[];
  height: number;
  stroke?: string;
}) {
  if (history.length < 2) return null;
  const ys = history.map((p) => p.money);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const viewW = 1000;
  const stepX = viewW / (history.length - 1);
  const points = history.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.money - minY) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${viewW} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline fill="none" stroke={stroke} strokeWidth={2.5} vectorEffect="non-scaling-stroke" points={points.join(' ')} />
    </svg>
  );
}
