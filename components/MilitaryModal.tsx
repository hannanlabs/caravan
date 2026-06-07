'use client';

import { InvestModal } from './InvestModal';
import { IconShield } from './icons';
import type { NationData } from '../lib/spacetimedb-server';

interface MilitaryModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  amount: number;
  setAmount: (n: number) => void;
  onInvest: (amount: bigint) => void;
}

export function MilitaryModal({ open, onClose, myNation, isActive, amount, setAmount, onInvest }: MilitaryModalProps) {
  return (
    <InvestModal
      open={open}
      onClose={onClose}
      myNation={myNation}
      isActive={isActive}
      amount={amount}
      setAmount={setAmount}
      onInvest={onInvest}
      icon={<IconShield />}
      title="Invest in military"
      sub="Strength projects power and stability"
      metric="military"
    />
  );
}
