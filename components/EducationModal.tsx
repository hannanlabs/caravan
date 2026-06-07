'use client';

import { InvestModal } from './InvestModal';
import { IconBook } from './icons';
import type { NationData } from '../lib/spacetimedb-server';

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  investAmt: number;
  setInvestAmt: (n: number) => void;
  onInvest: (amount: bigint) => void;
}

export function EducationModal({ open, onClose, myNation, isActive, investAmt, setInvestAmt, onInvest }: EducationModalProps) {
  return (
    <InvestModal
      open={open}
      onClose={onClose}
      myNation={myNation}
      isActive={isActive}
      amount={investAmt}
      setAmount={setInvestAmt}
      onInvest={onInvest}
      icon={<IconBook />}
      title="Invest in education"
      sub="Education compounds output"
      metric="education"
    />
  );
}
