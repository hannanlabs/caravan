'use client';

import { InvestModal } from './InvestModal';
import { IconPulse } from './icons';
import type { NationData } from '../lib/spacetimedb-server';

interface HealthcareModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  healthAmt: number;
  setHealthAmt: (n: number) => void;
  onInvest: (amount: bigint) => void;
}

export function HealthcareModal({ open, onClose, myNation, isActive, healthAmt, setHealthAmt, onInvest }: HealthcareModalProps) {
  return (
    <InvestModal
      open={open}
      onClose={onClose}
      myNation={myNation}
      isActive={isActive}
      amount={healthAmt}
      setAmount={setHealthAmt}
      onInvest={onInvest}
      icon={<IconPulse />}
      title="Invest in healthcare"
      sub="Health is a GDP multiplier (caps at +50%)"
      metric="health"
    />
  );
}
