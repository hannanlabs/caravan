'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../src/module_bindings';
import type { Resource } from '../src/module_bindings/types';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import TrustRow from '../src/module_bindings/trust_table';
import type { Infer } from 'spacetimedb';
import type { InitialSnapshot, WorldData, NationData } from '../lib/spacetimedb-server';
import { flagFor, metaFor } from '../lib/countries';
import { WorldMap } from './WorldMap';
import { Modal } from './Modal';

type ActionModal = 'trade' | 'education' | 'healthcare' | 'taxes' | 'stats' | null;

type TradeOfferData = Infer<typeof TradeOfferRow>;
type TrustData = Infer<typeof TrustRow>;

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

  // Track my GDP history client-side for the sparkline.
  const moneyHistory = useGdpHistory(world?.year ?? 0, myNation?.gdp);

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
          <WorldEventsCard nations={nationList} year={world.year} status={status} />
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
        history={moneyHistory}
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

/* ---------- formatting helpers ---------- */

function formatMoney(b: bigint): { value: string; unit: string } {
  // Treat raw u64 as millions of USD.
  // 1_000 → $1B, 1_000_000 → $1T, 671 → $671M
  const n = Number(b);
  if (n >= 1_000_000) return { value: (n / 1_000_000).toFixed(2), unit: 'Trillion' };
  if (n >= 1_000) return { value: (n / 1_000).toFixed(2), unit: 'Billion' };
  return { value: n.toString(), unit: 'Million' };
}

function formatMoneyShort(b: bigint): string {
  const n = Number(b);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}T`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}B`;
  return `$${n}M`;
}

function formatGdp(g: number): { value: string; unit: string } {
  if (g >= 1_000_000) return { value: (g / 1_000_000).toFixed(2), unit: 'Trillion' };
  if (g >= 1_000) return { value: (g / 1_000).toFixed(2), unit: 'Billion' };
  return { value: g.toFixed(0), unit: 'Million' };
}

function formatGdpShort(g: number): string {
  if (g >= 1_000_000) return `$${(g / 1_000_000).toFixed(1)}T`;
  if (g >= 1_000) return `$${(g / 1_000).toFixed(1)}B`;
  return `$${g.toFixed(0)}M`;
}

/* ---------- money history hook ---------- */

interface MoneyPoint { year: number; money: number; }

function useGdpHistory(year: number, gdp: number | undefined): MoneyPoint[] {
  const [history, setHistory] = useState<MoneyPoint[]>([]);
  const lastYearRef = useRef<number>(-1);

  useEffect(() => {
    if (gdp === undefined) return;
    if (year !== lastYearRef.current) {
      lastYearRef.current = year;
      setHistory((prev) => {
        const next = [...prev, { year, money: gdp }];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }
  }, [year, gdp]);

  return history;
}

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
        <div className="country-header">
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
        <div className="card-title">Country's GDP</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <span className="gdp-headline">${headlineGdp.value}</span>
            <span className="gdp-unit">{headlineGdp.unit}</span>
            {myNation && <span className="gdp-delta">+{(myNation.education * 100).toFixed(1)}% edu</span>}
          </div>
          <Sparkline history={history} width={140} height={36} />
        </div>
        <div className="gdp-substats">
          <Stat label="Rank" value={rank > 0 ? `${rank}${rankSuffix(rank)}` : '—'} foot="" />
          <Stat label="World Share" value={myNation ? `${worldShare.toFixed(1)}%` : '—'} foot="" />
          <Stat label="Money" value={myNation ? formatMoneyShort(myNation.money) : '—'} foot="cash" />
        </div>
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

function rankSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot neutral">{foot}</div>}
    </div>
  );
}

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

/* ---------- modals ---------- */

interface TradeModalProps {
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

function TradeModal(props: TradeModalProps) {
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

interface EducationModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  investAmt: string;
  setInvestAmt: (s: string) => void;
  onInvest: (amount: bigint) => void;
}

function EducationModal({ open, onClose, myNation, isActive, investAmt, setInvestAmt, onInvest }: EducationModalProps) {
  if (!open) return null;
  const presets = [10n, 100n, 500n, 1000n];
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
          <Section title="Spend money to raise education (₁₀₀ → +1.0%)">
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {presets.map((p) => (
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

interface StatsModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  rank: number;
  worldShare: number;
  nationCount: number;
  history: MoneyPoint[];
}

function StatsModal({ open, onClose, myNation, rank, worldShare, nationCount, history }: StatsModalProps) {
  if (!open) return null;
  if (!myNation) {
    return (
      <Modal open={open} onClose={onClose} title="📊 Live Stats" width={560}>
        <Empty>Claim a nation first to see live stats.</Empty>
      </Modal>
    );
  }
  const gdp = formatGdp(myNation.gdp);
  return (
    <Modal open={open} onClose={onClose} title={`${flagFor(myNation.name)} ${myNation.name} — Live Stats`} width={560}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <span className="gdp-headline">${gdp.value}</span>
          <span className="gdp-unit">{gdp.unit}</span>
        </div>
        <Sparkline history={history} width={180} height={40} />
      </div>
      <div className="gdp-substats">
        <Stat label="Goods" value={myNation.goods.toString()} foot="raw units" />
        <Stat label="Energy" value={myNation.energy.toString()} foot="raw units" />
        <Stat label="Tax Rate" value={`${(myNation.taxRate * 100).toFixed(0)}%`} foot="" />
      </div>
      <div className="gdp-substats">
        <Stat label="Rank" value={`${rank}${rankSuffix(rank)} / ${nationCount}`} foot="" />
        <Stat label="World Share" value={`${worldShare.toFixed(1)}%`} foot="of total GDP" />
        <Stat label="Education" value={`${(myNation.education * 100).toFixed(1)}%`} foot="0–100" />
      </div>
      <div className="gdp-substats">
        <Stat label="Cash" value={formatMoneyShort(myNation.money)} foot="liquid funds" />
        <Stat label="Health" value={`${(myNation.health * 100).toFixed(1)}%`} foot="0–100" />
        <Stat label="Reputation" value="—" foot="future" />
      </div>
    </Modal>
  );
}


interface HealthcareModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  healthAmt: string;
  setHealthAmt: (s: string) => void;
  onInvest: (amount: bigint) => void;
}

function HealthcareModal({ open, onClose, myNation, isActive, healthAmt, setHealthAmt, onInvest }: HealthcareModalProps) {
  if (!open) return null;
  const presets = [10n, 100n, 500n, 1000n];
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
              {presets.map((p) => (
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

interface TaxesModalProps {
  open: boolean;
  onClose: () => void;
  myNation?: NationData;
  isActive: boolean;
  taxInput: number;
  setTaxInput: (n: number) => void;
  onSetTax: (rate: number) => void;
}

function TaxesModal({ open, onClose, myNation, isActive, taxInput, setTaxInput, onSetTax }: TaxesModalProps) {
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

/* ---------- shared modal pieces ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.08, color: '#8b96b0', textTransform: 'uppercase' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#5a6580', fontStyle: 'italic', fontSize: 13, padding: '4px 0' }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#8b96b0', textTransform: 'uppercase', letterSpacing: 0.05 }}>{label}</span>
      {children}
    </label>
  );
}

function ProgressBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div style={{ flex: 1, height: 8, background: '#1f2940', borderRadius: 4, marginLeft: 12, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value * 100)}%`, background: accent }} />
    </div>
  );
}

function WorldEventsCard({ nations, year, status }: {
  nations: readonly NationData[]; year: number; status: string;
}) {
  return (
    <div className="card">
      <div className="card-title">World Events</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#8b96b0' }}>
        <div>Year {year.toFixed(2)} · {status}</div>
        <div>{nations.length} nation{nations.length === 1 ? '' : 's'} in play</div>
        <div className="card-coming">Live event feed comes in a future round.</div>
      </div>
    </div>
  );
}

const modalInputStyle: React.CSSProperties = {
  background: '#0a0e1a',
  border: '1px solid #2a3550',
  borderRadius: 6,
  padding: '8px 10px',
  color: '#e5eaf2',
  width: '100%',
  fontSize: 13,
};

const primaryButton: React.CSSProperties = {
  background: '#2ed573',
  border: 'none',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#0a0e1a',
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
};

const secondaryButton: React.CSSProperties = {
  background: '#1a2138',
  border: '1px solid #2a3550',
  borderRadius: 6,
  padding: '6px 12px',
  color: '#e5eaf2',
  fontSize: 12,
  cursor: 'pointer',
};

const approveButton: React.CSSProperties = {
  background: '#2ed573',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  color: '#0a0e1a',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 12,
};

const rejectButton: React.CSSProperties = {
  background: '#ff4757',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: 12,
};

const offerRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 10,
  background: '#0a0e1a',
  border: '1px solid #1f2940',
  borderRadius: 6,
};

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
