'use client';

import { Modal } from './Modal';
import { Empty, ProgressBar, Section, modalInputStyle, primaryButton, secondaryButton } from './shared';
import { formatMoneyShort } from '../lib/format';
import type { NationData } from '../lib/spacetimedb-server';

interface HealthcareModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  healthAmt: string;
  setHealthAmt: (s: string) => void;
  onInvest: (amount: bigint) => void;
}

const PRESETS = [10n, 100n, 500n, 1000n];

export function HealthcareModal({ open, onClose, myNation, isActive, healthAmt, setHealthAmt, onInvest }: HealthcareModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="❤ Invest in Healthcare" accent="#cf4f7f" width={460}>
      {myNation ? (
        <>
          <Section title="Current">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{(myNation.health * 100).toFixed(1)}%</div>
              <ProgressBar value={myNation.health} accent="#cf4f7f" />
            </div>
            <div style={{ fontSize: 12, color: '#8b96b0' }}>
              Cash on hand: {formatMoneyShort(myNation.money)} · health is a +50% GDP multiplier at 100%
            </div>
          </Section>
          <Section title="Spend money to raise health (100 → +1.0%)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.toString()}
                  onClick={() => setHealthAmt(p.toString())}
                  disabled={!isActive}
                  style={{
                    ...secondaryButton,
                    background: healthAmt === p.toString() ? '#cf4f7f' : '#1a2138',
                    color: healthAmt === p.toString() ? '#0a0e1a' : '#e5eaf2',
                  }}
                >
                  {p.toString()}
                </button>
              ))}
            </div>
            <input
              type="number" min={1} value={healthAmt}
              onChange={(e) => setHealthAmt(e.target.value)}
              style={modalInputStyle}
            />
            <button
              onClick={() => {
                try {
                  const amt = BigInt(healthAmt || '0');
                  if (amt > 0n) {
                    onInvest(amt);
                    onClose();
                  }
                } catch {}
              }}
              disabled={!isActive || !healthAmt || BigInt(healthAmt || '0') <= 0n}
              style={{ ...primaryButton, background: '#cf4f7f', color: '#fff', marginTop: 10 }}
            >
              Invest {healthAmt} (advances year by 0.25)
            </button>
          </Section>
        </>
      ) : (
        <Empty>Claim a nation first.</Empty>
      )}
    </Modal>
  );
}
