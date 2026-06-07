'use client';

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Block, Empty, Segmented, Stepper, Chip } from './shared';
import { IconArrowRight } from './icons';
import { formatMoneyShort } from '../lib/format';
import type { NationData } from '../lib/spacetimedb-server';

const PRESETS = [10, 100, 500, 1000] as const;

interface InvestModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  amount: number;
  setAmount: (n: number) => void;
  onInvest: (amount: bigint) => void;
  icon: ReactNode;
  title: string;
  sub: string;
  /** which 0–1 metric this invests in */
  metric: 'education' | 'health' | 'military' | 'technology';
}

export function InvestModal(props: InvestModalProps) {
  const { open, onClose, myNation, isActive, amount, setAmount, onInvest, icon, title, sub, metric } = props;
  if (!open) return null;

  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} icon={icon} title={title} width={500}>
        <Empty>Claim a nation first to invest.</Empty>
      </Modal>
    );
  }

  const rawCur = myNation[metric]; // 0–1
  const cur = Number.isFinite(rawCur) ? rawCur : 0;
  const gain = amount / 100; // +1.0 pt per 100 spent
  const projected = Math.min(100, cur * 100 + gain);
  const valid = amount > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={icon}
      title={title}
      sub={sub}
      width={500}
      foot={
        <>
          <span className="foot-note">Spending advances the year by 0.25.</span>
          <button
            className="btn btn-primary"
            disabled={!isActive || !valid}
            onClick={() => { if (valid) { onInvest(BigInt(Math.floor(amount))); onClose(); } }}
          >
            Invest {amount}
          </button>
        </>
      }
    >
      <Block
        label="Current"
        aside={<span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>Cash · {formatMoneyShort(myNation.money)}</span>}
      >
        <div className="gauge-row">
          <div className="gauge-num">{(cur * 100).toFixed(1)}<span style={{ fontSize: 26, color: 'var(--ink-3)' }}>%</span></div>
        </div>
        <div className="bar" style={{ marginTop: 4 }}><i style={{ width: `${Math.min(100, cur * 100)}%` }} /></div>
      </Block>

      <Block label="Amount to spend">
        <Segmented options={PRESETS} value={amount} onChange={setAmount} disabled={!isActive} />
        <Stepper value={amount} onChange={setAmount} step={10} min={0} disabled={!isActive} />
      </Block>

      <div className="projection">
        <span className="pj-from tnum">{(cur * 100).toFixed(1)}%</span>
        <IconArrowRight size={18} />
        <span className="pj-to tnum">{projected.toFixed(1)}%</span>
        <div style={{ flex: 1 }} />
        <Chip tone="accent">+{gain.toFixed(1)} pts</Chip>
      </div>
    </Modal>
  );
}
