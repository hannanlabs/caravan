'use client';

import { useEffect, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../src/module_bindings';
import type { Resource } from '../src/module_bindings/types';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import TrustRow from '../src/module_bindings/trust_table';
import WorldEventRow from '../src/module_bindings/world_event_table';
import GdpHistoryRow from '../src/module_bindings/gdp_history_table';
import type { Infer, Timestamp } from 'spacetimedb';
import type { InitialSnapshot, WorldData, NationData } from '../lib/spacetimedb-server';
import { flagFor, metaFor } from '../lib/countries';
import {
  formatGdp, formatGdpShort, formatMoneyShort, relativeTime,
} from '../lib/format';
import { WorldMap } from './WorldMap';
import { TradeModal } from '../components/TradeModal';
import { EducationModal } from '../components/EducationModal';
import { HealthcareModal } from '../components/HealthcareModal';
import { TaxesModal } from '../components/TaxesModal';
import { StatsModal } from '../components/StatsModal';

type ActionModal = 'trade' | 'education' | 'healthcare' | 'taxes' | 'stats' | null;

type TradeOfferData = Infer<typeof TradeOfferRow>;
type TrustData = Infer<typeof TrustRow>;
type WorldEventData = Infer<typeof WorldEventRow>;
type GdpHistoryData = Infer<typeof GdpHistoryRow>;

interface NationDashboardProps {
  initialSnapshot: InitialSnapshot;
}

export function NationDashboard({ initialSnapshot }: NationDashboardProps) {
  const [debugOn, setDebugOn] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDebugOn(new URLSearchParams(window.location.search).has('debug'));
    }
  }, []);

  const { isActive, identity } = useSpacetimeDB();
  // useTable returns [rows, subscribeApplied] — second value is TRUE once initial data arrives.
  const [worlds, worldReady] = useTable(tables.world);
  const [nations, nationsReady] = useTable(tables.nation);
  const [tradeOffers] = useTable(tables.tradeOffer);
  const [trustRows] = useTable(tables.trust);
  const [events] = useTable(tables.worldEvent);
  const [gdpRows] = useTable(tables.gdpHistory);

  const claim = useReducer(reducers.claimNation);
  const start = useReducer(reducers.startRun);
  const invest = useReducer(reducers.investEducation);
  const investHealth = useReducer(reducers.investHealthcare);
  const tax = useReducer(reducers.setTax);
  const propose = useReducer(reducers.proposeTrade);
  const respond = useReducer(reducers.respondTrade);
  const reset = useReducer(reducers.resetGame);

  const hydrated = isActive && worldReady && nationsReady;
  const world: WorldData | null = hydrated ? (worlds[0] ?? null) : initialSnapshot.world;
  const nationList: readonly NationData[] = hydrated ? nations : [];

  const myNation = identity
    ? nationList.find((n) => n.owner.toHexString() === identity.toHexString())
    : undefined;

  const sortedByGdp = [...nationList].sort((a, b) => b.gdp - a.gdp);
  const totalGdp = nationList.reduce((s, n) => s + n.gdp, 0);
  const myRank = myNation
    ? sortedByGdp.findIndex((n) => n.owner.toHexString() === myNation.owner.toHexString()) + 1
    : 0;
  const worldShare =
    myNation && totalGdp > 0 ? (myNation.gdp / totalGdp) * 100 : 0;

  const myHex = identity?.toHexString();
  const incomingOffers = tradeOffers.filter((o) => o.toOwner.toHexString() === myHex);
  const outgoingOffers = tradeOffers.filter((o) => o.fromOwner.toHexString() === myHex);

  // Build trust lookup: myHex → otherHex → value
  const trustOut = new Map<string, number>();
  for (const r of trustRows) {
    if (r.fromOwner.toHexString() === myHex) {
      trustOut.set(r.toOwner.toHexString(), r.value);
    }
  }

  const [nameInput, setNameInput] = useState('');
  const [taxInput, setTaxInput] = useState<number>(10);
  const [openModal, setOpenModal] = useState<ActionModal>(null);
  const [investAmt, setInvestAmt] = useState<string>('100');
  const [healthAmt, setHealthAmt] = useState<string>('100');

  useEffect(() => {
    if (myNation) setTaxInput(Math.round(myNation.taxRate * 100));
  }, [myNation?.owner.toHexString()]);

  // Pull my GDP history from the server-side gdp_history table.
  const moneyHistory: MoneyPoint[] = myNation
    ? gdpRows
        .filter((r) => r.owner.toHexString() === myNation.owner.toHexString())
        .map((r) => ({ year: r.year, money: r.gdp }))
        .sort((a, b) => a.year - b.year)
    : [];

  if (!world) {
    return (
      <main className="dash">
        {debugOn && (
          <DebugStrip
            isActive={isActive}
            worldReady={worldReady}
            nationsReady={nationsReady}
            identity={identity}
            worldCount={worlds.length}
            nationCount={nations.length}
            tradeCount={tradeOffers.length}
            trustCount={trustRows.length}
          />
        )}
        <div className="pregame card">Connecting to SpacetimeDB…</div>
      </main>
    );
  }

  const status = world.status.tag;

  return (
    <main className="dash">
      {debugOn && (
        <DebugStrip
          isActive={isActive}
          worldReady={worldReady}
          nationsReady={nationsReady}
          identity={identity}
          worldCount={worlds.length}
          nationCount={nations.length}
          tradeCount={tradeOffers.length}
          trustCount={trustRows.length}
        />
      )}
      <Header
        isActive={isActive}
        myNation={myNation}
        rank={myRank}
        worldShare={worldShare}
        totalGdp={totalGdp}
        history={moneyHistory}
        status={status}
        nameInput={nameInput}
        setNameInput={setNameInput}
        onClaim={(name) => claim({ name })}
        onStart={() => start()}
        onOpenModal={setOpenModal}
        onViewStats={() => setOpenModal('stats')}
      />

      {status === 'Ended' && sortedByGdp[0] && (
        <div style={{
          background: 'linear-gradient(90deg, #2ed57340, #2ed57310)',
          border: '1px solid #2ed573',
          borderRadius: 8,
          padding: '12px 16px',
          textAlign: 'center',
          fontSize: 16,
        }}>
          🏆 <strong>{sortedByGdp[0].name}</strong> wins with GDP {formatGdpShort(sortedByGdp[0].gdp)} ·
          {' '}{sortedByGdp[0].owner.toHexString() === identity?.toHexString() ? 'That\'s you!' : 'Hit Reset in the footer to play again.'}
        </div>
      )}

      <div className="dash-grid">
        <div className="dash-col">
          <RelationshipCards
            nations={sortedByGdp}
            identity={identity}
            trustOut={trustOut}
            winnerHex={status === 'Ended' && sortedByGdp[0] ? sortedByGdp[0].owner.toHexString() : undefined}
          />
        </div>

        <div className="dash-col">
          <div className="card">
            <div className="card-title">World Map</div>
            <WorldMap myNation={myNation} nations={nationList} trustOut={trustOut} />
          </div>
        </div>

        <div className="dash-col">
          {incomingOffers.length > 0 && (
            <div className="card" style={{ borderColor: '#2ed573' }}>
              <div className="card-title" style={{ color: '#2ed573' }}>
                Incoming Trades ({incomingOffers.length})
              </div>
              <button
                onClick={() => setOpenModal('trade')}
                style={{
                  background: '#2ed573', color: '#0a0e1a', border: 'none',
                  borderRadius: 6, padding: '8px 12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Review & respond
              </button>
            </div>
          )}
          <MetricsCard myNation={myNation} />
          <WorldEventsCard events={events} />
          <GdpHistoryCard history={moneyHistory} />
        </div>
      </div>

      <Footer world={world} status={status} nationCount={nationList.length} onReset={() => reset()} isActive={isActive} />

      <TradeModal
        open={openModal === 'trade'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        nations={nationList}
        isActive={isActive}
        incoming={incomingOffers}
        outgoing={outgoingOffers}
        onPropose={(args) => propose(args)}
        onApprove={(id) => respond({ offerId: id, approve: true })}
        onReject={(id) => respond({ offerId: id, approve: false })}
      />
      <EducationModal
        open={openModal === 'education'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        isActive={isActive}
        investAmt={investAmt}
        setInvestAmt={setInvestAmt}
        onInvest={(amount) => invest({ amount })}
      />
      <HealthcareModal
        open={openModal === 'healthcare'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        isActive={isActive}
        healthAmt={healthAmt}
        setHealthAmt={setHealthAmt}
        onInvest={(amount) => investHealth({ amount })}
      />
      <TaxesModal
        open={openModal === 'taxes'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        isActive={isActive}
        taxInput={taxInput}
        setTaxInput={setTaxInput}
        onSetTax={(rate) => tax({ rate })}
      />
      <StatsModal
        open={openModal === 'stats'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        rank={myRank}
        worldShare={worldShare}
        nationCount={nationList.length}
      />
    </main>
  );
}

/* ---------- debug strip ---------- */

function DebugStrip({
  isActive, worldReady, nationsReady, identity, worldCount, nationCount, tradeCount, trustCount,
}: {
  isActive: boolean;
  worldReady: boolean;
  nationsReady: boolean;
  identity?: { toHexString(): string };
  worldCount: number;
  nationCount: number;
  tradeCount: number;
  trustCount: number;
}) {
  return (
    <div style={{
      background: isActive ? '#1a3550' : '#5a1a1a',
      border: '1px solid #2a3550',
      borderRadius: 6,
      padding: '6px 12px',
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#e5eaf2',
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <span>WS: <strong style={{ color: isActive ? '#2ed573' : '#ff4757' }}>{isActive ? 'connected' : 'disconnected'}</strong></span>
      <span>identity: {identity ? identity.toHexString().slice(0, 12) + '…' : '(none)'}</span>
      <span>world: {worldCount}{worldReady ? '' : ' (waiting)'}</span>
      <span>nations: {nationCount}{nationsReady ? '' : ' (waiting)'}</span>
      <span>trade_offer: {tradeCount}</span>
      <span>trust: {trustCount}</span>
    </div>
  );
}

/* ---------- formatting + money history hook ---------- */

interface MoneyPoint { year: number; money: number; }

function Sparkline({ history, width, height, stroke = '#3742fa' }: {
  history: MoneyPoint[];
  width: number;
  height: number;
  stroke?: string;
}) {
  if (history.length < 2) {
    return (
      <svg width={width} height={height}>
        <line x1={0} y1={height - 1} x2={width} y2={height - 1} stroke="#2a3550" strokeDasharray="2 4" />
      </svg>
    );
  }
  const ys = history.map((p) => p.money);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  const stepX = width / (history.length - 1);
  const points = history.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.money - minY) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline fill="none" stroke={stroke} strokeWidth={2} points={points.join(' ')} />
    </svg>
  );
}

/* ---------- header strip ---------- */

interface HeaderProps {
  isActive: boolean;
  myNation?: NationData;
  rank: number;
  worldShare: number;
  totalGdp: number;
  history: MoneyPoint[];
  status: string;
  nameInput: string;
  setNameInput: (s: string) => void;
  onClaim: (name: string) => void;
  onStart: () => void;
  onOpenModal: (m: ActionModal) => void;
  onViewStats: () => void;
}

function Header(props: HeaderProps) {
  const { isActive, myNation, rank, worldShare, totalGdp, history, status,
    nameInput, setNameInput, onClaim, onStart, onOpenModal, onViewStats } = props;
  const headlineGdp = myNation ? formatGdp(myNation.gdp) : { value: '—', unit: '' };
  const meta = myNation ? metaFor(myNation.name) : null;

  return (
    <div className="dash-header">
      <div className="card">
        <div className="country-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="country-flag-big">{meta?.flag ?? '🏳'}</div>
            <div>
              <div className="country-name">
                {myNation?.name ?? 'Spectator'}{' '}
                <span className={`online-dot ${isActive ? 'on' : 'off'}`} />{' '}
                <span className="country-sub">{isActive ? 'Online' : 'Offline'}</span>
              </div>
              <div className="country-sub">{meta?.govType ?? 'Caravan'}</div>
            </div>
          </div>
          {myNation && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#8b96b0', letterSpacing: 0.08, textTransform: 'uppercase' }}>Cash</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2ed573', lineHeight: 1.1 }}>
                {formatMoneyShort(myNation.money)}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onViewStats}
          disabled={!myNation}
          style={{
            marginTop: 10,
            background: myNation ? '#1a2138' : '#131826',
            border: '1px solid #2a3550',
            borderRadius: 8,
            padding: '10px 14px',
            color: myNation ? '#e5eaf2' : '#5a6580',
            fontSize: 13,
            fontWeight: 600,
            cursor: myNation ? 'pointer' : 'not-allowed',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            width: '100%',
          }}
        >
          <span>📊 View live stats</span>
          <span style={{ fontSize: 11, color: '#8b96b0', fontWeight: 400 }}>
            {myNation ? 'GDP, resources, rank' : 'Claim a nation first'}
          </span>
        </button>
      </div>

      <div className="card">
        <div className="card-title">Actions</div>
        <HeaderActions
          isActive={isActive}
          status={status}
          myNation={myNation}
          nameInput={nameInput}
          setNameInput={setNameInput}
          onClaim={onClaim}
          onStart={onStart}
          onOpenModal={onOpenModal}
        />
      </div>
    </div>
  );
}

function HeaderActions(props: {
  isActive: boolean;
  status: string;
  myNation?: NationData;
  nameInput: string;
  setNameInput: (s: string) => void;
  onClaim: (name: string) => void;
  onStart: () => void;
  onOpenModal: (m: ActionModal) => void;
}) {
  const { isActive, status, myNation, nameInput, setNameInput, onClaim, onStart, onOpenModal } = props;

  if (!myNation && status === 'Lobby') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Nation name (e.g. USA, China, Japan)"
          style={{ ...inlineInputStyle, marginTop: 0 }}
        />
        <button
          onClick={() => { if (nameInput.trim()) { onClaim(nameInput.trim()); setNameInput(''); } }}
          disabled={!isActive || !nameInput.trim()}
          style={pregameButtonStyle}
        >
          Claim
        </button>
      </div>
    );
  }

  if (!myNation) {
    return <div className="card-empty" style={{ padding: '12px 0' }}>Game is {status}. Spectating only.</div>;
  }

  if (status === 'Lobby') {
    return (
      <div>
        <p style={{ color: '#8b96b0', fontSize: 12, marginBottom: 8 }}>You are {myNation.name}. Start when ready.</p>
        <button onClick={onStart} disabled={!isActive} style={pregameButtonStyle}>
          Start the run
        </button>
      </div>
    );
  }

  if (status === 'Ended') {
    return (
      <div className="card-empty" style={{ padding: '6px 0' }}>
        Final GDP <strong>{formatGdpShort(myNation.gdp)}</strong>
      </div>
    );
  }

  return (
    <div className="actions-grid">
      <button className="action-btn-big trade" disabled={!isActive} onClick={() => onOpenModal('trade')}>
        <span className="action-icon-big">🤝</span>
        <span>Trade</span>
      </button>
      <button className="action-btn-big education" disabled={!isActive} onClick={() => onOpenModal('education')}>
        <span className="action-icon-big">📚</span>
        <span>Education</span>
      </button>
      <button className="action-btn-big healthcare" disabled={!isActive} onClick={() => onOpenModal('healthcare')}>
        <span className="action-icon-big">❤</span>
        <span>Healthcare</span>
      </button>
      <button className="action-btn-big taxes" disabled={!isActive} onClick={() => onOpenModal('taxes')}>
        <span className="action-icon-big">🏛</span>
        <span>Taxes</span>
      </button>
    </div>
  );
}

const inlineInputStyle: React.CSSProperties = {
  background: '#0a0e1a',
  border: '1px solid #2a3550',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#e5eaf2',
  width: '100%',
  fontSize: 13,
};

const pregameButtonStyle: React.CSSProperties = {
  background: '#2ed573',
  border: 'none',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#0a0e1a',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
};

/* ---------- left column ---------- */

function RelationshipCards({
  nations,
  identity,
  trustOut,
  winnerHex,
}: {
  nations: readonly NationData[];
  identity?: { toHexString(): string };
  trustOut: Map<string, number>;
  winnerHex?: string;
}) {
  const myHex = identity?.toHexString();
  const others = nations.filter((n) => n.owner.toHexString() !== myHex);

  const allies: NationData[] = [];
  const rivals: NationData[] = [];
  const neutral: NationData[] = [];
  for (const n of others) {
    const t = trustOut.get(n.owner.toHexString());
    if (t === undefined) neutral.push(n);
    else if (t > 60) allies.push(n);
    else if (t < 40) rivals.push(n);
    else neutral.push(n);
  }

  return (
    <>
      <RelCard title="Allies" tone="ally" nations={allies} trustOut={trustOut} winnerHex={winnerHex} />
      <RelCard title="Rivals" tone="rival" nations={rivals} trustOut={trustOut} winnerHex={winnerHex} />
      <RelCard title="Neutral" tone="neutral" nations={neutral} trustOut={trustOut} winnerHex={winnerHex} />
    </>
  );
}

function RelCard({
  title,
  tone,
  nations,
  trustOut,
  winnerHex,
}: {
  title: string;
  tone: 'ally' | 'rival' | 'neutral';
  nations: NationData[];
  trustOut: Map<string, number>;
  winnerHex?: string;
}) {
  const toneColor = tone === 'ally' ? '#2ed573' : tone === 'rival' ? '#ff4757' : '#ffc107';
  return (
    <div className="card">
      <div className="card-title" style={{ color: toneColor }}>
        {title} ({nations.length})
      </div>
      {nations.length === 0 ? (
        <div className="card-empty" style={{ padding: '6px 0', fontSize: 11 }}>None</div>
      ) : (
        <div className="nation-list">
          {nations.map((n) => {
            const hex = n.owner.toHexString();
            const t = trustOut.get(hex);
            const winner = winnerHex === hex;
            return (
              <div key={hex} className="nation-row" style={winner ? { background: '#2ed57320' } : undefined}>
                <div className="nation-row-flag-emoji">{flagFor(n.name)}</div>
                <div>
                  <div className="nation-row-name">{winner && '🏆 '}{n.name}</div>
                  <div className="nation-row-meta">GDP {formatGdpShort(n.gdp)}</div>
                </div>
                <div className="nation-row-trust" style={{ color: toneColor }}>
                  {t === undefined ? '—' : `Trust: ${t}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- center column ---------- */

function GdpHistoryCard({ history }: { history: MoneyPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="card">
        <div className="card-title">Visualization · GDP over time</div>
        <div className="card-empty" style={{ padding: '12px 0', fontSize: 12 }}>
          Make a move to start tracking history.
        </div>
      </div>
    );
  }
  const first = history[0]!;
  const last = history[history.length - 1]!;
  const delta = last.money - first.money;
  const deltaPct = first.money > 0 ? (delta / first.money) * 100 : 0;
  return (
    <div className="card">
      <div className="card-title">Visualization · GDP over time</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8b96b0' }}>
        <span>Year {first.year.toFixed(2)} → {last.year.toFixed(2)}</span>
        <span style={{ color: delta >= 0 ? '#2ed573' : '#ff4757' }}>
          {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
        </span>
      </div>
      <div style={{ width: '100%' }}>
        <ResponsiveSparkline history={history} height={70} />
      </div>
    </div>
  );
}

function ResponsiveSparkline({ history, height, stroke = '#3742fa' }: {
  history: MoneyPoint[];
  height: number;
  stroke?: string;
}) {
  if (history.length < 2) return null;
  const ys = history.map((p) => p.money);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const range = maxY - minY || 1;
  // Use a viewBox with arbitrary width so it scales to container.
  const viewW = 1000;
  const stepX = viewW / (history.length - 1);
  const points = history.map((p, i) => {
    const x = i * stepX;
    const y = height - ((p.money - minY) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${viewW} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline fill="none" stroke={stroke} strokeWidth={2.5} vectorEffect="non-scaling-stroke" points={points.join(' ')} />
    </svg>
  );
}

/* ---------- right column ---------- */



function WorldEventsCard({ events }: { events: readonly WorldEventData[] }) {
  // Tick once per second so relative times update on screen.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const recent = [...events].sort((a, b) => (b.id > a.id ? 1 : -1)).slice(0, 8);

  return (
    <div className="card" style={{ maxHeight: 220, overflow: 'hidden' }}>
      <div className="card-title">World Events ({events.length})</div>
      {recent.length === 0 ? (
        <div className="card-empty" style={{ padding: '12px 0', fontSize: 12 }}>
          Nothing's happened yet. Claim, start, trade…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', minHeight: 0 }}>
          {recent.map((e) => (
            <EventRow key={e.id.toString()} event={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: WorldEventData }) {
  const flag = event.actorName === 'System' ? '⚙' : flagFor(event.actorName);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
      <span style={{ fontSize: 14, lineHeight: 1.2, flex: '0 0 auto' }}>{flag}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#e5eaf2', lineHeight: 1.3 }}>{event.text}</div>
        <div style={{ fontSize: 9, color: '#5a6580', letterSpacing: 0.04 }}>
          Year {event.year.toFixed(2)} · {relativeTime(event.createdAt)}
        </div>
      </div>
    </div>
  );
}

function MetricsCard({ myNation }: { myNation?: NationData }) {
  const eduPct = myNation ? Math.round(myNation.education * 100) : 0;
  const healthPct = myNation ? Math.round(myNation.health * 100) : 0;
  const taxPct = myNation ? Math.round(myNation.taxRate * 100) : 0;

  return (
    <div className="card">
      <div className="card-title">Other Metrics</div>
      <MetricRow label="Military" value={null} note="future" />
      <MetricRow label="Technology" value={null} note="future" />
      <MetricRow label="Education" value={eduPct} note={`raw: ${myNation?.education.toFixed(3) ?? '—'}`} />
      <MetricRow label="Health" value={healthPct} note={`raw: ${myNation?.health.toFixed(3) ?? '—'}`} />
      <MetricRow label="Tax Rate" value={taxPct} note={`raw: ${myNation?.taxRate.toFixed(3) ?? '—'}`} />
    </div>
  );
}

function MetricRow({ label, value, note }: { label: string; value: number | null; note: string }) {
  return (
    <div className="metric-row">
      <div style={{ flex: '0 0 90px', fontSize: 12, color: '#8b96b0' }}>{label}</div>
      <div className="metric-bar">
        <div className="metric-bar-fill" style={{ width: value === null ? '0%' : `${value}%` }} />
      </div>
      <div className="metric-value">{value === null ? '—' : value}</div>
      <div style={{ flex: '0 0 70px', fontSize: 10, color: '#5a6580', textAlign: 'right' }}>{note}</div>
    </div>
  );
}

/* ---------- footer ---------- */

function Footer({ world, status, nationCount, onReset, isActive }: {
  world: WorldData;
  status: string;
  nationCount: number;
  onReset: () => void;
  isActive: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleReset = () => {
    if (confirm('Reset the game? All nations + trades + trust will be wiped and the seed bots re-seeded.')) {
      onReset();
    }
  };

  return (
    <div className="dash-footer">
      <span>UTC {now.toISOString().substring(11, 19)}</span>
      <span>Game Year {world.year.toFixed(2)} / 100</span>
      <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>
      <span className="breaking">LIVE</span>
      <span className="ticker">
        {nationCount} nation{nationCount === 1 ? '' : 's'} playing · Caravan
      </span>
      <button
        onClick={handleReset}
        disabled={!isActive}
        style={{
          background: 'transparent',
          border: '1px solid #2a3550',
          borderRadius: 4,
          padding: '4px 10px',
          color: '#ff4757',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        Reset
      </button>
    </div>
  );
}
