'use client';

import { Modal } from './Modal';
import { Empty, ProgressBar, Section, primaryButton } from './shared';
import type { NationData } from '../lib/spacetimedb-server';

interface TaxesModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  taxInput: number;
  setTaxInput: (n: number) => void;
  onSetTax: (rate: number) => void;
}

export function TaxesModal({ open, onClose, myNation, isActive, taxInput, setTaxInput, onSetTax }: TaxesModalProps) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="🏛 Set Tax Rate" accent="#cfaf4f" width={460}>
      {myNation ? (
        <>
          <Section title="Current rate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{taxInput}%</div>
              <ProgressBar value={taxInput / 100} accent="#cfaf4f" />
            </div>
            <div style={{ fontSize: 12, color: '#8b96b0', marginTop: 6 }}>
              GDP drag at this rate: <strong>{(taxInput * 0.5).toFixed(1)}%</strong>
            </div>
          </Section>
          <Section title="Adjust">
            <input
              type="range" min={0} max={100} value={taxInput}
              onChange={(e) => setTaxInput(Number(e.target.value))}
              style={{ width: '100%' }}
              disabled={!isActive}
            />
            <button
              onClick={() => {
                onSetTax(taxInput / 100);
                onClose();
              }}
              disabled={!isActive}
              style={{ ...primaryButton, marginTop: 10 }}
            >
              Set tax to {taxInput}% (advances year by 0.25)
            </button>
          </Section>
        </>
      ) : (
        <Empty>Claim a nation first.</Empty>
      )}
    </Modal>
  );
}
