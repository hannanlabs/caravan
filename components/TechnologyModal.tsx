'use client';

import { InvestModal } from './InvestModal';
import { IconCpu } from './icons';
import type { NationData } from '../lib/spacetimedb-server';

interface TechnologyModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  amount: number;
  setAmount: (n: number) => void;
  onInvest: (amount: bigint) => void;
}

export function TechnologyModal({ open, onClose, myNation, isActive, amount, setAmount, onInvest }: TechnologyModalProps) {
  return (
    <InvestModal
      open={open}
      onClose={onClose}
      myNation={myNation}
      isActive={isActive}
      amount={amount}
      setAmount={setAmount}
      onInvest={onInvest}
      icon={<IconCpu />}
      title="Invest in technology"
      sub="R&D compounds national output"
      metric="technology"
    />
  );
}
