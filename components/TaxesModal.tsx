'use client';

import { Modal } from './Modal';
import { Block, Empty, Range, Chip } from './shared';
import { IconBank } from './icons';
import { formatGdpShort } from '../lib/format';
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

  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} icon={<IconBank />} title="Set tax rate" width={480}>
        <Empty>Claim a nation first to set a tax rate.</Empty>
      </Modal>
    );
  }

  const drag = (taxInput * 0.5).toFixed(1);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<IconBank />}
      title="Set tax rate"
      sub="Higher revenue, slower growth"
      width={480}
      foot={
        <>
          <span className="foot-note">Tax is harvested each year you advance.</span>
          <button
            className="btn btn-primary"
            disabled={!isActive}
            onClick={() => { onSetTax(taxInput / 100); onClose(); }}
          >
            Apply {taxInput}% rate
          </button>
        </>
      }
    >
      <Block label="Current rate" aside={<Chip tone="neutral">Drag {drag}% on GDP</Chip>}>
        <div className="gauge-row">
          <div className="gauge-num">{taxInput}<span style={{ fontSize: 26, color: 'var(--ink-3)' }}>%</span></div>
        </div>
      </Block>

      <Block label="Adjust">
        <Range value={taxInput} max={100} onChange={setTaxInput} disabled={!isActive} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>
          <span>0% · max growth</span><span>100% · max revenue</span>
        </div>
      </Block>

      <div className="projection">
        <div style={{ flex: 1 }}>
          <div className="pj-label">Projected annual revenue</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
            <span className="pj-to tnum">{formatGdpShort(myNation.gdp * taxInput / 100)}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>collected / yr</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
