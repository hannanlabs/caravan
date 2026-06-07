'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Empty, Field } from './shared';
import { IconExchange, IconCheck, IconX, IconArrowRight } from './icons';
import { flagFor } from '../lib/countries';
import { relativeTime } from '../lib/format';
import type { NationData } from '../lib/spacetimedb-server';
import type { Resource } from '../src/module_bindings/types';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import type { Infer } from 'spacetimedb';

type TradeOfferData = Infer<typeof TradeOfferRow>;
type ResTag = 'Goods' | 'Energy';

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

type Tab = 'incoming' | 'propose' | 'pending';

export function TradeModal(props: TradeModalProps) {
  const { open, onClose, myNation, nations, isActive, incoming, outgoing, onPropose, onApprove, onReject } = props;
  const [tab, setTab] = useState<Tab>('incoming');
  if (!open) return null;

  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} icon={<IconExchange />} title="Diplomacy & trade" width={600}>
        <Empty>Claim a nation first to start trading.</Empty>
      </Modal>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'incoming', label: 'Incoming', count: incoming.length },
    { id: 'propose', label: 'Propose' },
    { id: 'pending', label: 'Pending', count: outgoing.length },
  ];

  const nameOf = (hex: string) => nations.find((n) => n.owner.toHexString() === hex)?.name ?? 'Unknown';

  return (
    <Modal open={open} onClose={onClose} icon={<IconExchange />} title="Diplomacy & trade" sub="Negotiate resource exchanges" width={600}>
      <div className="segmented">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="seg"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.count != null && t.count > 0 && <span className="seg-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'incoming' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {incoming.length === 0 ? (
            <Empty>No incoming offers right now.</Empty>
          ) : (
            incoming.map((o) => (
              <OfferCard
                key={o.id.toString()}
                offer={o}
                fromName={nameOf(o.fromOwner.toHexString())}
                isActive={isActive}
                onApprove={() => onApprove(o.id)}
                onReject={() => onReject(o.id)}
              />
            ))
          )}
        </div>
      )}

      {tab === 'propose' && (
        <ProposeForm myNation={myNation} nations={nations} isActive={isActive} onPropose={onPropose} onSent={() => setTab('pending')} />
      )}

      {tab === 'pending' && (
        <div>
          {outgoing.length === 0 ? (
            <Empty>You have no outstanding offers.</Empty>
          ) : (
            outgoing.map((o) => (
              <div className="pending-row" key={o.id.toString()}>
                <span className="pending-dot" />
                <span className="offer-flag" style={{ width: 26, height: 26, fontSize: 15 }}>{flagFor(nameOf(o.toOwner.toHexString()))}</span>
                <span style={{ fontWeight: 600 }}>{nameOf(o.toOwner.toHexString())}</span>
                <span style={{ flex: 1, color: 'var(--ink-3)', fontSize: 12.5 }} className="tnum">
                  &nbsp;give {o.giveAmount.toString()} {o.giveResource.tag.toLowerCase()} · get {o.getAmount.toString()} {o.getResource.tag.toLowerCase()}
                </span>
                <span className="chip chip-neutral">Awaiting</span>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

function OfferCard({
  offer, fromName, isActive, onApprove, onReject,
}: {
  offer: TradeOfferData;
  fromName: string;
  isActive: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  // Incoming offer: the proposer gives `giveAmount/giveResource` and wants `getAmount/getResource`.
  // From my perspective I RECEIVE what they give, and I GIVE what they want.
  return (
    <div className="offer">
      <div className="offer-top">
        <span className="offer-flag">{flagFor(fromName)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="offer-who">{fromName}</div>
          <div className="offer-when">Proposed {relativeTime(offer.createdAt)}</div>
        </div>
        <span className="chip chip-accent">Trade offer</span>
      </div>
      <div className="offer-exchange">
        <div className="leg get">
          <div className="leg-label">You receive</div>
          <div className="leg-amt tnum">+{offer.giveAmount.toString()}</div>
          <div className="leg-res">{offer.giveResource.tag.toLowerCase()}</div>
        </div>
        <div className="exchange-arrow"><IconExchange size={18} /></div>
        <div className="leg give">
          <div className="leg-label">You give</div>
          <div className="leg-amt tnum">&minus;{offer.getAmount.toString()}</div>
          <div className="leg-res">{offer.getResource.tag.toLowerCase()}</div>
        </div>
      </div>
      <div className="offer-actions">
        <button className="btn btn-soft-neg" disabled={!isActive} onClick={onReject}><IconX size={15} />Reject</button>
        <button className="btn btn-pos" disabled={!isActive} onClick={onApprove}><IconCheck size={15} />Approve</button>
      </div>
    </div>
  );
}

function ProposeForm({
  myNation, nations, isActive, onPropose, onSent,
}: {
  myNation: NationData;
  nations: readonly NationData[];
  isActive: boolean;
  onPropose: TradeModalProps['onPropose'];
  onSent: () => void;
}) {
  const others = nations.filter((n) => n.owner.toHexString() !== myNation.owner.toHexString());
  const [targetHex, setTargetHex] = useState('');
  const [giveRes, setGiveRes] = useState<ResTag>('Goods');
  const [giveAmt, setGiveAmt] = useState('10');
  const [getRes, setGetRes] = useState<ResTag>('Energy');
  const [getAmt, setGetAmt] = useState('10');

  useEffect(() => {
    if (others.length > 0 && !others.find((n) => n.owner.toHexString() === targetHex)) {
      setTargetHex(others[0]!.owner.toHexString());
    }
  }, [others.map((n) => n.owner.toHexString()).join(',')]);

  if (others.length === 0) return <Empty>No other nations to trade with yet.</Empty>;

  const target = others.find((n) => n.owner.toHexString() === targetHex);

  const submit = () => {
    if (!target) return;
    const g = BigInt(giveAmt || '0');
    const r = BigInt(getAmt || '0');
    if (g <= 0n || r <= 0n) return;
    onPropose({
      to: target.owner,
      giveResource: { tag: giveRes } as Resource,
      giveAmount: g,
      getResource: { tag: getRes } as Resource,
      getAmount: r,
    });
    onSent();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Trade partner">
        <select className="select" value={targetHex} onChange={(e) => setTargetHex(e.target.value)}>
          {others.map((n) => (
            <option key={n.owner.toHexString()} value={n.owner.toHexString()}>{flagFor(n.name)}  {n.name}</option>
          ))}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="leg-label" style={{ color: 'var(--neg)' }}>You give</span>
          <select className="select" value={giveRes} onChange={(e) => setGiveRes(e.target.value as ResTag)}>
            <option value="Goods">Goods</option>
            <option value="Energy">Energy</option>
          </select>
          <input className="input tnum" type="number" min={1} value={giveAmt} onChange={(e) => setGiveAmt(e.target.value)} />
        </div>
        <div style={{ color: 'var(--ink-4)', paddingTop: 28 }}><IconExchange size={20} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="leg-label" style={{ color: 'var(--pos)' }}>You receive</span>
          <select className="select" value={getRes} onChange={(e) => setGetRes(e.target.value as ResTag)}>
            <option value="Energy">Energy</option>
            <option value="Goods">Goods</option>
          </select>
          <input className="input tnum" type="number" min={1} value={getAmt} onChange={(e) => setGetAmt(e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary btn-block btn-lg" disabled={!isActive || !target} onClick={submit}>
        <IconArrowRight size={16} />
        <span>Send offer{target ? ` to ${target.name}` : ''}</span>
      </button>
    </div>
  );
}
