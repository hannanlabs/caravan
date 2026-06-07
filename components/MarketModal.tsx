'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Block, Chip, Stepper } from './shared';
import { IconMarket, IconArrowUp, IconArrowDown, IconArrowRight } from './icons';
import { formatPrice, formatPct, formatAmount } from '../lib/format';
import { COMMODITIES, COMMODITY_KEYS, type CommodityKey } from '../spacetimedb/src/market';
import type { Infer } from 'spacetimedb';
import CommodityMarketRow from '../src/module_bindings/commodity_market_table';
import MarketHistoryRow from '../src/module_bindings/market_history_table';

type MarketRow = Infer<typeof CommodityMarketRow>;
type HistoryRow = Infer<typeof MarketHistoryRow>;

export interface MarketModalProps {
  open: boolean;
  onClose: () => void;
  isActive: boolean;
  markets: readonly MarketRow[];
  history: readonly HistoryRow[];
  stock: Record<string, number>;
  onBuy: (commodity: string, amount: number) => void;
  onSell: (commodity: string, amount: number) => void;
}

export function MarketModal({ open, onClose, isActive, markets, history, stock, onBuy, onSell }: MarketModalProps) {
  const [selected, setSelected] = useState<CommodityKey>('oil');
  const [amount, setAmount] = useState(10);
  useEffect(() => { setAmount(10); }, [selected]);

  if (!open) return null;

  const marketOf = (c: string) => markets.find((m) => m.commodity === c);
  const idx = COMMODITY_KEYS.indexOf(selected);
  const shuffle = (dir: number) => setSelected(COMMODITY_KEYS[(idx + dir + COMMODITY_KEYS.length) % COMMODITY_KEYS.length]!);

  const m = marketOf(selected);
  const def = COMMODITIES[selected];
  const myAmt = stock[selected] ?? 0;
  const series = history
    .filter((h) => h.commodity === selected)
    .sort((a, b) => a.year - b.year)
    .map((h) => h.price);

  return (
    <Modal open={open} onClose={onClose} icon={<IconMarket />} title="Global Market" sub="Live commodity exchange" width={760}>
      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 18 }}>
        {/* master list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          {COMMODITY_KEYS.map((c) => {
            const mk = marketOf(c);
            const up = (mk?.priceChangePercent ?? 0) >= 0;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelected(c)}
                className="mkt-row"
                aria-pressed={c === selected}
              >
                <span className="mkt-name">{COMMODITIES[c].label}</span>
                <span className="mkt-price tnum">{formatPrice(mk?.currentPrice ?? COMMODITIES[c].basePrice)}</span>
                <span className={`mkt-chg tnum ${up ? 'pos' : 'neg'}`}>{formatPct(mk?.priceChangePercent ?? 0)}</span>
              </button>
            );
          })}
        </div>

        {/* detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="eyebrow">{def.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
                <span className="display" style={{ fontSize: 34 }}>{formatPrice(m?.currentPrice ?? def.basePrice)}</span>
                <span className={`chip ${(m?.priceChangePercent ?? 0) >= 0 ? 'chip-pos' : 'chip-neg'}`}>
                  {(m?.priceChangePercent ?? 0) >= 0 ? <IconArrowUp size={13} /> : <IconArrowDown size={13} />}
                  {formatPct(m?.priceChangePercent ?? 0)}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="icon-btn" onClick={() => shuffle(-1)} aria-label="Previous commodity">‹</button>
              <button className="icon-btn" onClick={() => shuffle(1)} aria-label="Next commodity">›</button>
            </div>
          </div>

          <Sparkline series={series} up={(m?.priceChange ?? 0) >= 0} />

          <Warnings m={m} myAmt={myAmt} need={def.consumptionPerNation} />

          <div className="statgrid" style={{ borderRadius: 12, boxShadow: 'inset 0 0 0 1px var(--line-2)', overflow: 'hidden' }}>
            <Cell label="Supply" value={formatAmount(m?.globalSupply ?? def.baseSupply)} />
            <Cell label="Demand" value={formatAmount(m?.globalDemand ?? def.baseDemand)} />
            <Cell label="Scarcity" value={`${Math.round((m?.scarcityLevel ?? 0) * 100)}%`} />
            <Cell label="My stockpile" value={formatAmount(myAmt)} />
            <Cell label="Base price" value={formatPrice(def.basePrice)} />
            <Cell label="Order value" value={formatPrice((m?.currentPrice ?? def.basePrice) * amount)} />
          </div>

          <Block label="Trade">
            <Stepper value={amount} onChange={setAmount} step={10} min={0} disabled={!isActive} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-soft-neg"
                style={{ flex: 1 }}
                disabled={!isActive || amount <= 0 || myAmt < amount}
                onClick={() => onSell(selected, amount)}
              >
                Sell {amount}
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={!isActive || amount <= 0}
                onClick={() => onBuy(selected, amount)}
              >
                <IconArrowRight size={15} />Buy {amount}
              </button>
            </div>
          </Block>
        </div>
      </div>
    </Modal>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="statcell">
      <div className="sc-label">{label}</div>
      <div className="sc-value tnum" style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}

function Warnings({ m, myAmt, need }: { m?: MarketRow; myAmt: number; need: number }) {
  const tags: { tone: 'pos' | 'neg' | 'neutral' | 'accent'; text: string }[] = [];
  if (m) {
    if (m.priceChangePercent > 8) tags.push({ tone: 'neg', text: 'Price spike' });
    if (m.scarcityLevel > 0.7) tags.push({ tone: 'neg', text: 'Shortage risk' });
    if (m.recentBuyVolume > m.globalDemand * 0.15) tags.push({ tone: 'accent', text: 'High demand' });
    if (m.recentSellVolume > m.globalSupply * 0.15) tags.push({ tone: 'neutral', text: 'Heavy selling' });
  }
  if (myAmt < need) tags.push({ tone: 'neg', text: 'Below yearly need' });
  if (tags.length === 0) tags.push({ tone: 'pos', text: 'Stable' });
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((t, i) => <Chip key={i} tone={t.tone}>{t.text}</Chip>)}
    </div>
  );
}

function Sparkline({ series, up }: { series: number[]; up: boolean }) {
  if (series.length < 2) {
    return <div className="empty" style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No price history yet — advance a year.</div>;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const W = 300, H = 96;
  const pts = series.map((v, i) => [(i / (series.length - 1)) * W, H - ((v - min) / range) * (H - 10) - 5] as const);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const color = up ? 'var(--pos)' : 'var(--neg)';
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 96, display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="mkt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#mkt-fill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill="#fff" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
