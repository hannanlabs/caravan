'use client';

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Empty, Field } from './shared';
import { IconExchange, IconCheck, IconX, IconArrowRight, IconShield } from './icons';
import { flagFor } from '../lib/countries';
import { relativeTime } from '../lib/format';
import { COMMODITIES, COMMODITY_KEYS } from '../spacetimedb/src/market';
import type { NationData } from '../lib/spacetimedb-server';
import type { Identity } from 'spacetimedb';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import WarRow from '../src/module_bindings/war_table';
import type { Infer } from 'spacetimedb';

type TradeOfferData = Infer<typeof TradeOfferRow>;
type WarData = Infer<typeof WarRow>;

export interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  nations: readonly NationData[];
  isActive: boolean;
  incoming: TradeOfferData[];
  outgoing: TradeOfferData[];
  stock: Record<string, number>;
  wars: WarData[];
  currentYear: number;
  onPropose: (args: { to: Identity; giveCommodity: string; giveAmount: bigint; getCommodity: string; getAmount: bigint }) => void;
  onApprove: (id: bigint) => void;
  onReject: (id: bigint) => void;
  onDeclareWar: (target: Identity) => void;
  onMakePeace: (warId: bigint) => void;
}

type Tab = 'incoming' | 'propose' | 'pending' | 'war';
const label = (c: string) => COMMODITIES[c as keyof typeof COMMODITIES]?.label ?? c;

export function TradeModal(props: TradeModalProps) {
  const { open, onClose, myNation, nations, isActive, incoming, outgoing, stock, wars, currentYear, onPropose, onApprove, onReject, onDeclareWar, onMakePeace } = props;
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
    { id: 'war', label: 'War', count: wars.length },
  ];
  const nameOf = (hex: string) => nations.find((n) => n.owner.toHexString() === hex)?.name ?? 'Unknown';

  return (
    <Modal open={open} onClose={onClose} icon={<IconExchange />} title="Diplomacy & trade" sub="Trade commodities · declare or end wars" width={600}>
      <div className="segmented">
        {tabs.map((t) => (
          <button key={t.id} type="button" className="seg" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
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
        <ProposeForm myNation={myNation} nations={nations} isActive={isActive} stock={stock} onPropose={onPropose} onSent={() => setTab('pending')} />
      )}

      {tab === 'war' && (
        <WarTab myNation={myNation} nations={nations} isActive={isActive} wars={wars} currentYear={currentYear} onDeclareWar={onDeclareWar} onMakePeace={onMakePeace} />
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
                  &nbsp;give {o.giveAmount.toString()} {label(o.giveCommodity)} · get {o.getAmount.toString()} {label(o.getCommodity)}
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

function OfferCard({ offer, fromName, isActive, onApprove, onReject }: {
  offer: TradeOfferData; fromName: string; isActive: boolean; onApprove: () => void; onReject: () => void;
}) {
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
          <div className="leg-res">{label(offer.giveCommodity)}</div>
        </div>
        <div className="exchange-arrow"><IconExchange size={18} /></div>
        <div className="leg give">
          <div className="leg-label">You give</div>
          <div className="leg-amt tnum">&minus;{offer.getAmount.toString()}</div>
          <div className="leg-res">{label(offer.getCommodity)}</div>
        </div>
      </div>
      <div className="offer-actions">
        <button className="btn btn-soft-neg" disabled={!isActive} onClick={onReject}><IconX size={15} />Reject</button>
        <button className="btn btn-pos" disabled={!isActive} onClick={onApprove}><IconCheck size={15} />Approve</button>
      </div>
    </div>
  );
}

function WarTab({ myNation, nations, isActive, wars, currentYear, onDeclareWar, onMakePeace }: {
  myNation: NationData; nations: readonly NationData[]; isActive: boolean; wars: WarData[]; currentYear: number;
  onDeclareWar: (target: Identity) => void; onMakePeace: (warId: bigint) => void;
}) {
  const myHex = myNation.owner.toHexString();
  const enemyHexOf = (w: WarData) => (w.attacker.toHexString() === myHex ? w.defender.toHexString() : w.attacker.toHexString());
  const atWar = new Set(wars.map(enemyHexOf));
  const nationOf = (hex: string) => nations.find((n) => n.owner.toHexString() === hex);
  const peaceable = nations.filter((n) => n.owner.toHexString() !== myHex && !atWar.has(n.owner.toHexString()));
  const mil = (n?: NationData) => (n ? Math.round(n.military * 100) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="block">
        <span className="eyebrow">Your wars</span>
        {wars.length === 0 ? (
          <Empty>Not at war. Peace is good for GDP.</Empty>
        ) : (
          wars.map((w) => {
            const enemy = nationOf(enemyHexOf(w));
            const years = Math.max(0, Math.round((currentYear - w.startYear) * 100) / 100);
            return (
              <div className="offer" key={w.id.toString()}>
                <div className="offer-top">
                  <span className="offer-flag">{flagFor(enemy?.name ?? '')}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="offer-who">{enemy?.name ?? 'Unknown'}</div>
                    <div className="offer-when">{w.attacker.toHexString() === myHex ? 'You declared' : 'Declared on you'} · {years} yr{years === 1 ? '' : 's'} · enemy mil {mil(enemy)}</div>
                  </div>
                  <span className="chip chip-neg">⚔ At war</span>
                </div>
                <div className="offer-actions">
                  <button className="btn btn-pos" disabled={!isActive} onClick={() => onMakePeace(w.id)}>Sue for peace</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="block">
        <span className="eyebrow">Declare war · your military {mil(myNation)}</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
          {peaceable.map((n) => (
            <div className="nrow" key={n.owner.toHexString()} style={{ gridTemplateColumns: '26px 1fr auto' }}>
              <span className="nrow-flag">{flagFor(n.name)}</span>
              <div style={{ minWidth: 0 }}>
                <div className="nrow-name">{n.name}</div>
                <div className="nrow-gdp">Military {mil(n)}{mil(n) > mil(myNation) ? ' · stronger' : ''}</div>
              </div>
              <button className="btn btn-soft-neg btn-sm" disabled={!isActive} onClick={() => onDeclareWar(n.owner)}>
                <IconShield size={14} />Declare
              </button>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          War cuts both nations&rsquo; GDP every year it lasts — worse the longer it runs and the weaker your military.
        </div>
      </div>
    </div>
  );
}

function ProposeForm({ myNation, nations, isActive, stock, onPropose, onSent }: {
  myNation: NationData; nations: readonly NationData[]; isActive: boolean; stock: Record<string, number>;
  onPropose: TradeModalProps['onPropose']; onSent: () => void;
}) {
  const others = nations.filter((n) => n.owner.toHexString() !== myNation.owner.toHexString());
  const [targetHex, setTargetHex] = useState('');
  const [giveC, setGiveC] = useState<string>('oil');
  const [giveAmt, setGiveAmt] = useState('10');
  const [getC, setGetC] = useState<string>('grain');
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
    onPropose({ to: target.owner, giveCommodity: giveC, giveAmount: g, getCommodity: getC, getAmount: r });
    onSent();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label="Trade partner">
        <select className="select" value={targetHex} onChange={(e) => setTargetHex(e.target.value)}>
          {others.map((n) => <option key={n.owner.toHexString()} value={n.owner.toHexString()}>{flagFor(n.name)}  {n.name}</option>)}
        </select>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="leg-label" style={{ color: 'var(--neg)' }}>You give · have {stock[giveC] ?? 0}</span>
          <select className="select" value={giveC} onChange={(e) => setGiveC(e.target.value)}>
            {COMMODITY_KEYS.map((c) => <option key={c} value={c}>{COMMODITIES[c].label}</option>)}
          </select>
          <input className="input tnum" type="number" min={1} value={giveAmt} onChange={(e) => setGiveAmt(e.target.value)} />
        </div>
        <div style={{ color: 'var(--ink-4)', paddingTop: 28 }}><IconExchange size={20} /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="leg-label" style={{ color: 'var(--pos)' }}>You receive</span>
          <select className="select" value={getC} onChange={(e) => setGetC(e.target.value)}>
            {COMMODITY_KEYS.map((c) => <option key={c} value={c}>{COMMODITIES[c].label}</option>)}
          </select>
          <input className="input tnum" type="number" min={1} value={getAmt} onChange={(e) => setGetAmt(e.target.value)} />
        </div>
      </div>

      <button className="btn btn-primary btn-block btn-lg" disabled={!isActive || !target} onClick={submit}>
        <IconArrowRight size={16} /><span>Send offer{target ? ` to ${target.name}` : ''}</span>
      </button>
    </div>
  );
}
