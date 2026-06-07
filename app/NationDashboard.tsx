'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../src/module_bindings';
import type { InitialSnapshot, WorldData, NationData } from '../lib/spacetimedb-server';

interface NationDashboardProps {
  initialSnapshot: InitialSnapshot;
}

export function NationDashboard({ initialSnapshot }: NationDashboardProps) {
  const { isActive, identity } = useSpacetimeDB();
  const [worlds, worldLoading] = useTable(tables.world);
  const [nations, nationsLoading] = useTable(tables.nation);

  const claim = useReducer(reducers.claimNation);
  const start = useReducer(reducers.startRun);
  const invest = useReducer(reducers.investEducation);
  const tax = useReducer(reducers.setTax);

  const hydrated = isActive && !worldLoading && !nationsLoading;
  const world: WorldData | null = hydrated ? (worlds[0] ?? null) : initialSnapshot.world;
  const nationList: readonly NationData[] = hydrated ? nations : [];

  const myNation = identity
    ? nationList.find((n) => n.owner.toHexString() === identity.toHexString())
    : undefined;

  const sortedByMoney = [...nationList].sort((a, b) =>
    b.money > a.money ? 1 : b.money < a.money ? -1 : 0
  );
  const totalMoney = nationList.reduce((s, n) => s + n.money, 0n);
  const myRank = myNation
    ? sortedByMoney.findIndex((n) => n.owner.toHexString() === myNation.owner.toHexString()) + 1
    : 0;
  const worldShare =
    myNation && totalMoney > 0n
      ? (Number(myNation.money) / Number(totalMoney)) * 100
      : 0;

  const [nameInput, setNameInput] = useState('');
  const [taxInput, setTaxInput] = useState<number>(10);

  useEffect(() => {
    if (myNation) setTaxInput(Math.round(myNation.taxRate * 100));
  }, [myNation?.owner.toHexString()]);

  // Track my money history client-side for the sparkline.
  const moneyHistory = useMoneyHistory(world?.year ?? 0, myNation?.money);

  if (!world) {
    return <main className="dash"><div className="pregame card">Connecting to SpacetimeDB…</div></main>;
  }

  const status = world.status.tag;

  return (
    <main className="dash">
      <Header
        isActive={isActive}
        myNation={myNation}
        rank={myRank}
        worldShare={worldShare}
        totalMoney={totalMoney}
      />

      <div className="dash-grid">
        <div className="dash-col">
          <FlagCard myNation={myNation} />
          <NationListCard
            title="All Nations"
            note="Allies / Rivals / Neutral split comes with Round 4 trust"
            nations={sortedByMoney}
            identity={identity}
          />
        </div>

        <div className="dash-col">
          <GdpCard
            myNation={myNation}
            rank={myRank}
            worldShare={worldShare}
            totalMoney={totalMoney}
            nationCount={nationList.length}
            history={moneyHistory}
          />
          <WorldMapCard />
          <GdpHistoryCard history={moneyHistory} />
        </div>

        <div className="dash-col">
          <ActionsCard
            isActive={isActive}
            status={status}
            myNation={myNation}
            nameInput={nameInput}
            setNameInput={setNameInput}
            taxInput={taxInput}
            setTaxInput={setTaxInput}
            onClaim={(name) => claim({ name })}
            onStart={() => start()}
            onInvest={() => invest({ amount: 100n })}
            onSetTax={(rate) => tax({ rate })}
          />
          <CreateTradeCard />
          <MetricsCard myNation={myNation} />
        </div>
      </div>

      <Footer world={world} status={status} nationCount={nationList.length} />
    </main>
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

/* ---------- money history hook ---------- */

interface MoneyPoint { year: number; money: number; }

function useMoneyHistory(year: number, money: bigint | undefined): MoneyPoint[] {
  const [history, setHistory] = useState<MoneyPoint[]>([]);
  const lastYearRef = useRef<number>(-1);

  useEffect(() => {
    if (money === undefined) return;
    // Only push when year changed — cheap sample on each action.
    if (year !== lastYearRef.current) {
      lastYearRef.current = year;
      setHistory((prev) => {
        const next = [...prev, { year, money: Number(money) }];
        return next.length > 200 ? next.slice(-200) : next;
      });
    }
  }, [year, money]);

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
  totalMoney: bigint;
}

function Header({ isActive, myNation, rank, worldShare, totalMoney }: HeaderProps) {
  const headlineMoney = myNation ? formatMoney(myNation.money) : { value: '—', unit: '' };

  return (
    <div className="dash-header">
      <div className="card">
        <div className="country-header">
          <div className="country-flag">FLAG</div>
          <div>
            <div className="country-name">
              {myNation?.name ?? 'Spectator'}{' '}
              <span className={`online-dot ${isActive ? 'on' : 'off'}`} />{' '}
              <span className="country-sub">{isActive ? 'Online' : 'Offline'}</span>
            </div>
            <div className="country-sub">Caravan · Round 2 build</div>
          </div>
        </div>
        <div className="stat-row">
          <Stat label="Reputation" value="—" foot="Round 4" />
          <Stat
            label="National GDP"
            value={myNation ? formatMoneyShort(myNation.money) : '—'}
            foot={myNation ? `Edu ${(myNation.education * 100).toFixed(0)}%` : ''}
          />
          <Stat label="Health Index" value="—" foot="Round 5" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Country's GDP</div>
        <div>
          <span className="gdp-headline">${headlineMoney.value}</span>
          <span className="gdp-unit">{headlineMoney.unit}</span>
          {myNation && <span className="gdp-delta">+{(myNation.education * 100).toFixed(1)}% edu</span>}
        </div>
        <div className="gdp-substats">
          <Stat label="Rank" value={rank > 0 ? `${rank}${rankSuffix(rank)}` : '—'} foot="" />
          <Stat label="World Share" value={myNation ? `${worldShare.toFixed(1)}%` : '—'} foot="" />
          <Stat label="Population" value="—" foot="Round 5" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">World Treasury</div>
        <div>
          <span className="gdp-headline" style={{ fontSize: 28 }}>
            {totalMoney > 0n ? formatMoneyShort(totalMoney) : '—'}
          </span>
        </div>
        <div className="card-coming">Sum of every nation's money</div>
      </div>
    </div>
  );
}

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

function FlagCard({ myNation }: { myNation?: NationData }) {
  return (
    <div className="card">
      <div className="card-title">Flag</div>
      <div className="country-flag" style={{ width: '100%', height: 100, fontSize: 14, fontWeight: 600, color: '#e5eaf2' }}>
        {myNation ? myNation.name.toUpperCase() : 'NO NATION'}
      </div>
    </div>
  );
}

function NationListCard({
  title,
  note,
  nations,
  identity,
}: {
  title: string;
  note: string;
  nations: readonly NationData[];
  identity?: { toHexString(): string };
}) {
  return (
    <div className="card">
      <div className="card-title">{title} ({nations.length})</div>
      <div className="nation-list">
        {nations.length === 0 && <div className="card-empty">No nations yet</div>}
        {nations.map((n) => {
          const me = identity && n.owner.toHexString() === identity.toHexString();
          return (
            <div key={n.owner.toHexString()} className={`nation-row ${me ? 'me' : ''}`}>
              <div className="nation-row-flag" />
              <div>
                <div className="nation-row-name">{n.name}{me && ' (you)'}</div>
                <div className="nation-row-meta">{formatMoneyShort(n.money)} · Edu {(n.education * 100).toFixed(0)}%</div>
              </div>
              <div className="nation-row-trust">Trust: —</div>
            </div>
          );
        })}
      </div>
      <div className="card-coming">{note}</div>
    </div>
  );
}

/* ---------- center column ---------- */

interface GdpCardProps {
  myNation?: NationData;
  rank: number;
  worldShare: number;
  totalMoney: bigint;
  nationCount: number;
  history: MoneyPoint[];
}

function GdpCard({ myNation, rank, worldShare, totalMoney, nationCount, history }: GdpCardProps) {
  if (!myNation) {
    return (
      <div className="card">
        <div className="card-title">My Nation</div>
        <div className="card-empty">Claim a nation to see live stats.</div>
      </div>
    );
  }

  const money = formatMoney(myNation.money);

  return (
    <div className="card">
      <div className="card-title">{myNation.name} — Live Stats</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <span className="gdp-headline">${money.value}</span>
          <span className="gdp-unit">{money.unit}</span>
        </div>
        <Sparkline history={history} width={140} height={36} />
      </div>
      <div className="gdp-substats">
        <Stat label="Goods" value={myNation.goods.toString()} foot="raw units" />
        <Stat label="Energy" value={myNation.energy.toString()} foot="raw units" />
        <Stat label="Tax Rate" value={`${(myNation.taxRate * 100).toFixed(0)}%`} foot="" />
      </div>
      <div className="gdp-substats">
        <Stat label="Rank" value={`${rank}${rankSuffix(rank)} / ${nationCount}`} foot="" />
        <Stat label="World Share" value={`${worldShare.toFixed(1)}%`} foot="of total money" />
        <Stat label="Education" value={`${(myNation.education * 100).toFixed(1)}%`} foot="0–100" />
      </div>
    </div>
  );
}

function WorldMapCard() {
  return (
    <div className="card" style={{ minHeight: 220 }}>
      <div className="card-title">World Map</div>
      <span className="card-coming">Coming Round 6+ (needs country geo data)</span>
      <div className="card-empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
        🗺
      </div>
    </div>
  );
}

function GdpHistoryCard({ history }: { history: MoneyPoint[] }) {
  if (history.length < 2) {
    return (
      <div className="card">
        <div className="card-title">Visualization · GDP over time</div>
        <div className="card-empty">Make a move to start tracking history.</div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b96b0' }}>
        <span>Year {first.year.toFixed(2)} → {last.year.toFixed(2)}</span>
        <span style={{ color: delta >= 0 ? '#2ed573' : '#ff4757' }}>
          {delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}%
        </span>
      </div>
      <Sparkline history={history} width={520} height={120} />
    </div>
  );
}

/* ---------- right column ---------- */

interface ActionsCardProps {
  isActive: boolean;
  status: string;
  myNation?: NationData;
  nameInput: string;
  setNameInput: (s: string) => void;
  taxInput: number;
  setTaxInput: (n: number) => void;
  onClaim: (name: string) => void;
  onStart: () => void;
  onInvest: () => void;
  onSetTax: (rate: number) => void;
}

function ActionsCard(props: ActionsCardProps) {
  const { isActive, status, myNation, nameInput, setNameInput, taxInput, setTaxInput,
    onClaim, onStart, onInvest, onSetTax } = props;

  if (!myNation && status === 'Lobby') {
    return (
      <div className="card pregame">
        <div className="card-title">Claim your nation</div>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Nation name"
        />
        <button onClick={() => { if (nameInput.trim()) { onClaim(nameInput.trim()); setNameInput(''); } }}
          disabled={!isActive || !nameInput.trim()}>
          Claim
        </button>
      </div>
    );
  }

  if (!myNation) {
    return (
      <div className="card">
        <div className="card-title">Actions</div>
        <div className="card-empty">Game is {status}. Spectating only.</div>
      </div>
    );
  }

  if (status === 'Lobby') {
    return (
      <div className="card pregame">
        <div className="card-title">Lobby</div>
        <p style={{ color: '#8b96b0' }}>You are {myNation.name}. Start when ready.</p>
        <button onClick={onStart} disabled={!isActive}>Start the run</button>
      </div>
    );
  }

  if (status === 'Ended') {
    return (
      <div className="card">
        <div className="card-title">Game over</div>
        <div className="card-empty">Final money: {formatMoneyShort(myNation.money)}</div>
      </div>
    );
  }

  // status === 'Running'
  return (
    <div className="card">
      <div className="card-title">Actions</div>
      <div className="actions-grid">
        <button className="action-btn" disabled title="Coming Round 4">
          <span className="action-icon">🤝</span>
          Trade
        </button>
        <button
          className="action-btn"
          disabled={!isActive || myNation.money < 100n}
          onClick={onInvest}
          title="Invest 100 in Education"
        >
          <span className="action-icon">📚</span>
          Education
        </button>
        <button className="action-btn" disabled title="Coming later">
          <span className="action-icon">❤</span>
          Healthcare
        </button>
        <button className="action-btn" title="Set tax rate below">
          <span className="action-icon">🏛</span>
          Taxes
        </button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 12, color: '#8b96b0', minWidth: 70 }}>
          Tax: {taxInput}%
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={taxInput}
          onChange={(e) => setTaxInput(Number(e.target.value))}
          onMouseUp={() => onSetTax(taxInput / 100)}
          onTouchEnd={() => onSetTax(taxInput / 100)}
          disabled={!isActive}
          style={{ flex: 1 }}
        />
      </label>
    </div>
  );
}

function CreateTradeCard() {
  return (
    <div className="card">
      <div className="card-title">Create Trade</div>
      <span className="card-coming">Coming Round 4 (trade_offer table)</span>
    </div>
  );
}

function MetricsCard({ myNation }: { myNation?: NationData }) {
  const eduPct = myNation ? Math.round(myNation.education * 100) : 0;
  const taxPct = myNation ? Math.round(myNation.taxRate * 100) : 0;

  return (
    <div className="card">
      <div className="card-title">Other Metrics</div>
      <MetricRow label="Military" value={null} note="Round 5+" />
      <MetricRow label="Technology" value={null} note="Round 5+" />
      <MetricRow label="Education" value={eduPct} note={`raw: ${myNation?.education.toFixed(3) ?? '—'}`} />
      <MetricRow label="Tax Rate" value={taxPct} note={`raw: ${myNation?.taxRate.toFixed(3) ?? '—'}`} />
      <MetricRow label="Diplomacy" value={null} note="Round 4" />
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

function Footer({ world, status, nationCount }: { world: WorldData; status: string; nationCount: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dash-footer">
      <span>UTC {now.toISOString().substring(11, 19)}</span>
      <span>Game Year {world.year.toFixed(2)} / 100</span>
      <span className={`status-pill ${status.toLowerCase()}`}>{status}</span>
      <span className="breaking">LIVE</span>
      <span className="ticker">
        {nationCount} nation{nationCount === 1 ? '' : 's'} playing · Caravan Round 2 build
      </span>
    </div>
  );
}
