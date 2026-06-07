'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import {
  Empty, Field, Section,
  approveButton, modalInputStyle, offerRowStyle, primaryButton, rejectButton,
} from './shared';
import { flagFor } from '../lib/countries';
import type { NationData } from '../lib/spacetimedb-server';
import type { Resource } from '../src/module_bindings/types';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import type { Infer } from 'spacetimedb';

type TradeOfferData = Infer<typeof TradeOfferRow>;

export interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  nations: readonly NationData[];
  isActive: boolean;
  incoming: TradeOfferData[];
  outgoing: TradeOfferData[];
  onPropose: (args: {
    to: NationData['owner'];
    giveResource: Resource;
    giveAmount: bigint;
    getResource: Resource;
    getAmount: bigint;
  }) => void;
  onApprove: (id: bigint) => void;
  onReject: (id: bigint) => void;
}

export function TradeModal(props: TradeModalProps) {
  const { open, onClose, myNation, nations, isActive, incoming, outgoing, onPropose, onApprove, onReject } = props;
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="🤝 Diplomacy & Trade" accent="#5a4faf" width={640}>
      {myNation ? (
        <>
          <Section title="Incoming offers">
            {incoming.length === 0 ? (
              <Empty>No one's offering you anything right now.</Empty>
            ) : (
              incoming.map((o) => {
                const from = nations.find((n) => n.owner.toHexString() === o.fromOwner.toHexString());
                return (
                  <div key={o.id.toString()} style={offerRowStyle}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontSize: 20 }}>{from ? flagFor(from.name) : '🏳'}</span>{' '}
                      <strong>{from?.name ?? '?'}</strong> offers{' '}
                      <span style={{ color: '#2ed573' }}>{o.giveAmount.toString()} {o.giveResource.tag.toLowerCase()}</span>{' '}
                      for{' '}
                      <span style={{ color: '#ff4757' }}>{o.getAmount.toString()} {o.getResource.tag.toLowerCase()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onApprove(o.id)} disabled={!isActive} style={approveButton}>Approve</button>
                      <button onClick={() => onReject(o.id)} disabled={!isActive} style={rejectButton}>Reject</button>
                    </div>
                  </div>
                );
              })
            )}
          </Section>
          <Section title="Create new trade">
            <ProposeTradeForm
              myNation={myNation}
              nations={nations}
              isActive={isActive}
              onPropose={onPropose}
            />
          </Section>
          <Section title="Awaiting response">
            {outgoing.length === 0 ? (
              <Empty>You don't have any outgoing offers.</Empty>
            ) : (
              outgoing.map((o) => {
                const target = nations.find((n) => n.owner.toHexString() === o.toOwner.toHexString());
                return (
                  <div key={o.id.toString()} style={{ fontSize: 12, color: '#8b96b0', padding: '4px 0' }}>
                    → {target ? `${flagFor(target.name)} ${target.name}` : '?'}:
                    {' '}{o.giveAmount.toString()} {o.giveResource.tag.toLowerCase()}
                    {' '}for {o.getAmount.toString()} {o.getResource.tag.toLowerCase()}
                  </div>
                );
              })
            )}
          </Section>
        </>
      ) : (
        <Empty>Claim a nation first to start trading.</Empty>
      )}
    </Modal>
  );
}

function ProposeTradeForm({
  myNation, nations, isActive, onPropose,
}: {
  myNation: NationData;
  nations: readonly NationData[];
  isActive: boolean;
  onPropose: TradeModalProps['onPropose'];
}) {
  const others = nations.filter((n) => n.owner.toHexString() !== myNation.owner.toHexString());
  const [targetHex, setTargetHex] = useState('');
  const [giveRes, setGiveRes] = useState<'Goods' | 'Energy'>('Goods');
  const [giveAmt, setGiveAmt] = useState('10');
  const [getRes, setGetRes] = useState<'Goods' | 'Energy'>('Energy');
  const [getAmt, setGetAmt] = useState('10');

  useEffect(() => {
    if (others.length > 0 && !others.find((n) => n.owner.toHexString() === targetHex)) {
      setTargetHex(others[0]!.owner.toHexString());
    }
  }, [others.map((n) => n.owner.toHexString()).join(',')]);

  const submit = () => {
    const target = others.find((n) => n.owner.toHexString() === targetHex);
    if (!target) return;
    const g = BigInt(giveAmt || '0');
    const r = BigInt(getAmt || '0');
    if (g === 0n || r === 0n) return;
    onPropose({
      to: target.owner,
      giveResource: { tag: giveRes } as Resource,
      giveAmount: g,
      getResource: { tag: getRes } as Resource,
      getAmount: r,
    });
  };

  if (others.length === 0) return <Empty>No other nations to trade with yet.</Empty>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Partner">
        <select value={targetHex} onChange={(e) => setTargetHex(e.target.value)} style={modalInputStyle}>
          {others.map((n) => (
            <option key={n.owner.toHexString()} value={n.owner.toHexString()}>{flagFor(n.name)} {n.name}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="You give">
          <select value={giveRes} onChange={(e) => setGiveRes(e.target.value as any)} style={modalInputStyle}>
            <option value="Goods">Goods</option>
            <option value="Energy">Energy</option>
          </select>
        </Field>
        <Field label="Amount">
          <input type="number" min={1} value={giveAmt} onChange={(e) => setGiveAmt(e.target.value)} style={modalInputStyle} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="You receive">
          <select value={getRes} onChange={(e) => setGetRes(e.target.value as any)} style={modalInputStyle}>
            <option value="Goods">Goods</option>
            <option value="Energy">Energy</option>
          </select>
        </Field>
        <Field label="Amount">
          <input type="number" min={1} value={getAmt} onChange={(e) => setGetAmt(e.target.value)} style={modalInputStyle} />
        </Field>
      </div>
      <button onClick={submit} disabled={!isActive} style={primaryButton}>Send offer</button>
    </div>
  );
}
