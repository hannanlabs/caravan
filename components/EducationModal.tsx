'use client';

import { Modal } from './Modal';
import { Empty, ProgressBar, Section, modalInputStyle, primaryButton, secondaryButton } from './shared';
import { formatMoneyShort } from '../lib/format';
import type { NationData } from '../lib/spacetimedb-server';

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  investAmt: string;
  setInvestAmt: (s: string) => void;
  onInvest: (amount: bigint) => void;
}

const PRESETS = [10n, 100n, 500n, 1000n];

export function EducationModal({ open, onClose, myNation, isActive, investAmt, setInvestAmt, onInvest }: EducationModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="📚 Invest in Education" accent="#4f7fcf" width={460}>
      {myNation ? (
        <>
          <Section title="Current">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{(myNation.education * 100).toFixed(1)}%</div>
              <ProgressBar value={myNation.education} accent="#4f7fcf" />
            </div>
            <div style={{ fontSize: 12, color: '#8b96b0' }}>Cash on hand: {formatMoneyShort(myNation.money)}</div>
          </Section>
          <Section title="Spend money to raise education (100 → +1.0%)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.toString()}
                  onClick={() => setInvestAmt(p.toString())}
                  disabled={!isActive}
                  style={{
                    ...secondaryButton,
                    background: investAmt === p.toString() ? '#4f7fcf' : '#1a2138',
                    color: investAmt === p.toString() ? '#0a0e1a' : '#e5eaf2',
                  }}
                >
                  {p.toString()}
                </button>
              ))}
            </div>
            <input
              type="number" min={1} value={investAmt}
              onChange={(e) => setInvestAmt(e.target.value)}
              style={modalInputStyle}
            />
            <button
              onClick={() => {
                try {
                  const amt = BigInt(investAmt || '0');
                  if (amt > 0n) {
                    onInvest(amt);
                    onClose();
                  }
                } catch {}
              }}
              disabled={!isActive || !investAmt || BigInt(investAmt || '0') <= 0n}
              style={{ ...primaryButton, marginTop: 10 }}
            >
              Invest {investAmt} (advances year by 0.25)
            </button>
          </Section>
        </>
      ) : (
        <Empty>Claim a nation first.</Empty>
      )}
    </Modal>
  );
}
