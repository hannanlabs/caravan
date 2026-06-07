'use client';

import { formatGdpShort } from '../../lib/format';
import { IconArrowUp, IconArrowDown } from '../icons';

export interface MoneyPoint { year: number; money: number; }

export function GdpHistoryCard({ history }: { history: MoneyPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="card card-pad">
        <div className="card-title" style={{ marginBottom: 6 }}>
          <span className="ct-label">GDP over time</span>
        </div>
        <div className="empty">Make a move to start tracking history.</div>
      </div>
    );
  }

  const first = history[0]!.money;
  const last = history[history.length - 1]!.money;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const up = pct >= 0;

  const ys = history.map((p) => p.money);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const W = 300, H = 88;
  const pts = history.map((p, i) => [
    (i / (history.length - 1)) * W,
    H - ((p.money - min) / range) * (H - 10) - 5,
  ] as const);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const lastPt = pts[pts.length - 1]!;

  return (
    <div className="card card-pad">
      <div className="card-title" style={{ marginBottom: 6 }}>
        <span className="ct-label">GDP over time</span>
      </div>
      <div className="chart-head">
        <span className="chart-val">{formatGdpShort(last)}</span>
        <span className={`chip ${up ? 'chip-pos' : 'chip-neg'}`}>
          {up ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
          {up ? '+' : ''}{pct.toFixed(1)}%
        </span>
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="gfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#gfill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={lastPt[0]} cy={lastPt[1]} r={3.5} fill="#fff" stroke="var(--accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
