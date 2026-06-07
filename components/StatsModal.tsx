'use client';

import { Modal } from './Modal';
import { Empty, Stat } from './shared';
import { flagFor } from '../lib/countries';
import { formatGdp, formatMoneyShort, rankSuffix } from '../lib/format';
import type { NationData } from '../lib/spacetimedb-server';

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  rank: number;
  worldShare: number;
  nationCount: number;
}

export function StatsModal({ open, onClose, myNation, rank, worldShare, nationCount }: StatsModalProps) {
  if (!open) return null;
  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} title="📊 Live Stats" width={560}>
        <Empty>Claim a nation first to see live stats.</Empty>
      </Modal>
    );
  }
  const gdp = formatGdp(myNation.gdp);
  return (
    <Modal open={open} onClose={onClose} title={`${flagFor(myNation.name)} ${myNation.name}: Live Stats`} width={560}>
      <div>
        <span className="gdp-headline">${gdp.value}</span>
        <span className="gdp-unit">{gdp.unit}</span>
      </div>
      <div className="gdp-substats">
        <Stat label="Goods" value={myNation.goods.toString()} foot="raw units" />
        <Stat label="Energy" value={myNation.energy.toString()} foot="raw units" />
        <Stat label="Tax Rate" value={`${(myNation.taxRate * 100).toFixed(0)}%`} foot="" />
      </div>
      <div className="gdp-substats">
        <Stat label="Rank" value={`${rank}${rankSuffix(rank)} / ${nationCount}`} foot="" />
        <Stat label="World Share" value={`${worldShare.toFixed(1)}%`} foot="of total GDP" />
        <Stat label="Education" value={`${(myNation.education * 100).toFixed(1)}%`} foot="0–100" />
      </div>
      <div className="gdp-substats">
        <Stat label="Cash" value={formatMoneyShort(myNation.money)} foot="liquid funds" />
        <Stat label="Health" value={`${(myNation.health * 100).toFixed(1)}%`} foot="0–100" />
        <Stat label="Reputation" value="—" foot="future" />
      </div>
    </Modal>
  );
}
