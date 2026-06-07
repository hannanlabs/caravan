'use client';

import { Modal } from './Modal';
import { Block, Empty } from './shared';
import { IconChart } from './icons';
import { flagFor, metaFor } from '../lib/countries';
import { formatGdp, formatGdpShort, formatMoneyShort, rankSuffix, formatAmount } from '../lib/format';
import { COMMODITIES, COMMODITY_KEYS } from '../spacetimedb/src/market';
import type { NationData } from '../lib/spacetimedb-server';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  rank: number;
  worldShare: number;
  nationCount: number;
  stock: Record<string, number>;
  holdingsValue: number;
  assetCount: number;
}

export function StatsModal({ open, onClose, myNation, rank, worldShare, nationCount, stock, holdingsValue, assetCount }: StatsModalProps) {
  if (!open) return null;
  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} icon={<IconChart />} title="Live statistics" width={580}>
        <Empty>Claim a nation first to see live statistics.</Empty>
      </Modal>
    );
  }

  const gdp = formatGdp(myNation.gdp);
  const meta = metaFor(myNation.name);
  const cells = [
    { label: 'Cash reserves', value: formatMoneyShort(myNation.money), foot: 'Liquid funds' },
    { label: 'Holdings value', value: formatGdpShort(holdingsValue), foot: 'Commodities @ market' },
    { label: 'Assets built', value: String(assetCount), foot: 'Capital' },
    { label: 'Tax rate', value: `${Math.round(myNation.taxRate * 100)}%`, foot: 'Policy' },
    { label: 'Education', value: `${(myNation.education * 100).toFixed(0)}`, foot: 'Index' },
    { label: 'Health', value: `${(myNation.health * 100).toFixed(0)}`, foot: 'Index' },
  ];

  return (
    <Modal open={open} onClose={onClose} icon={<IconChart />} title="Live statistics" sub={`${flagFor(myNation.name)} ${myNation.name} · ${meta.govType}`} width={580}>
      <Block label="Gross domestic product">
        <div className="gauge-row">
          <div className="display" style={{ fontSize: 50 }}>
            ${gdp.value}
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: 0, marginLeft: 8 }}>{gdp.unit}</span>
          </div>
        </div>
      </Block>

      <Block label="Global standing">
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'baseline', gap: 7, whiteSpace: 'nowrap' }}>
            <span className="display" style={{ fontSize: 28 }}>{rank}{rankSuffix(rank)}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>of {nationCount}</span>
          </div>
          <div style={{ width: 1, height: 30, background: 'var(--line-2)', flex: 'none' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, whiteSpace: 'nowrap', gap: 12 }}>
              <span style={{ color: 'var(--ink-3)' }}>World GDP share</span>
              <span className="tnum" style={{ fontWeight: 700, fontSize: 14 }}>{worldShare.toFixed(1)}%</span>
            </div>
            <div className="bar"><i style={{ width: `${Math.min(100, worldShare)}%` }} /></div>
          </div>
        </div>
      </Block>

      <div style={{ borderRadius: 13, boxShadow: 'inset 0 0 0 1px var(--line-2)', overflow: 'hidden' }}>
        <div className="statgrid">
          {cells.map((c) => (
            <div className="statcell" key={c.label}>
              <div className="sc-label">{c.label}</div>
              <div className="sc-value tnum">{c.value}</div>
              <div className="sc-foot">{c.foot}</div>
            </div>
          ))}
        </div>
      </div>

      <Block label="Stockpiles">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {COMMODITY_KEYS.map((c) => (
            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: 'var(--ink-2)' }}>{COMMODITIES[c].label}</span>
              <span className="tnum" style={{ fontWeight: 700 }}>{formatAmount(stock[c] ?? 0)}</span>
            </div>
          ))}
        </div>
      </Block>
    </Modal>
  );
}
