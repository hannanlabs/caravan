'use client';

import { useEffect, useState } from 'react';
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

  const [nameInput, setNameInput] = useState('');
  const [taxInput, setTaxInput] = useState<number>(10);

  useEffect(() => {
    if (myNation) setTaxInput(Math.round(myNation.taxRate * 100));
  }, [myNation?.owner.toHexString()]);

  if (!world) {
    return <main className="dash"><div className="pregame card">Connecting to SpacetimeDB…</div></main>;
  }

  const status = world.status.tag;

  return (
    <main className="dash">
      <Header isActive={isActive} myNation={myNation} />

      <div className="dash-grid">
        <div className="dash-col">
          <FlagCard myNation={myNation} />
          <AlliesCard />
          <RivalsCard />
          <NeutralCard />
        </div>

        <div className="dash-col">
          <GdpCard myNation={myNation} nationList={nationList} />
          <WorldMapCard />
          <GdpHistoryCard />
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

/* ---------- header strip ---------- */

function Header({ isActive, myNation }: { isActive: boolean; myNation?: NationData }) {
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
          <Stat label="National GDP" value="—" foot="—" />
          <Stat label="Health Index" value="—" foot="Round 5" />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Country's GDP</div>
        <div className="card-empty">wired in step 2.4</div>
      </div>

      <div className="card">
        <div className="card-title">Actions</div>
        <div className="card-empty">wired in step 2.4</div>
      </div>
    </div>
  );
}

function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot neutral">{foot}</div>
    </div>
  );
}

/* ---------- left column ---------- */

function FlagCard({ myNation }: { myNation?: NationData }) {
  return (
    <div className="card">
      <div className="card-title">Flag</div>
      <div className="country-flag" style={{ width: '100%', height: 100 }}>
        {myNation ? myNation.name.toUpperCase() : '—'}
      </div>
    </div>
  );
}

function AlliesCard() {
  return (
    <div className="card">
      <div className="card-title">Allies</div>
      <span className="card-coming">Coming Round 4 (trust)</span>
    </div>
  );
}

function RivalsCard() {
  return (
    <div className="card">
      <div className="card-title">Rivals</div>
      <span className="card-coming">Coming Round 4 (trust)</span>
    </div>
  );
}

function NeutralCard() {
  return (
    <div className="card">
      <div className="card-title">Neutral</div>
      <span className="card-coming">Coming Round 4 (trust)</span>
    </div>
  );
}

/* ---------- center column ---------- */

function GdpCard({ myNation, nationList }: { myNation?: NationData; nationList: readonly NationData[] }) {
  return (
    <div className="card">
      <div className="card-title">My Nation</div>
      <div className="card-empty">
        {myNation ? `${myNation.name} — wired in step 2.4` : 'No nation yet'}
      </div>
    </div>
  );
}

function WorldMapCard() {
  return (
    <div className="card" style={{ minHeight: 220 }}>
      <div className="card-title">World Map</div>
      <span className="card-coming">Coming Round 6+</span>
      <div className="card-empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        🗺
      </div>
    </div>
  );
}

function GdpHistoryCard() {
  return (
    <div className="card">
      <div className="card-title">Visualization · GDP over time</div>
      <span className="card-coming">Coming step 2.5 (client-side history)</span>
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
        <div className="card-empty">Final money: {myNation.money.toString()}</div>
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
  return (
    <div className="card">
      <div className="card-title">Other Metrics</div>
      <div className="card-empty">wired in step 2.4</div>
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
