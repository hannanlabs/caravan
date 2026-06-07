'use client';

import { metaFor, flagFor, allCountryNames } from '../../lib/countries';
import { formatGdpShort } from '../../lib/format';
import type { NationData } from '../../lib/spacetimedb-server';
import type { ActionModal } from './types';
import { IconChart, IconExchange, IconBook, IconPulse, IconBank, IconPlay, IconShield, IconCpu, IconMarket } from '../icons';

interface HeaderProps {
  isActive: boolean;
  myNation?: NationData;
  status: string;
  nameInput: string;
  setNameInput: (s: string) => void;
  onClaim: (name: string) => void;
  onStart: () => void;
  onOpenModal: (m: ActionModal) => void;
  incomingCount: number;
  holdingsValue: number;
}

export function Header(props: HeaderProps) {
  const { myNation, onOpenModal, holdingsValue } = props;

  return (
    <div className="strip">
      <IdentityCard myNation={myNation} isActive={props.isActive} holdingsValue={holdingsValue} />
      <div className="card">
        <div className="card-pad" style={{ paddingBottom: 4 }}>
          <div className="card-title">
            <span className="ct-label">Actions</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" disabled={!myNation} onClick={() => onOpenModal('market')}>
                <IconMarket size={15} />Market
              </button>
              <button className="btn btn-ghost btn-sm" disabled={!myNation} onClick={() => onOpenModal('stats')}>
                <IconChart size={15} />Live stats
              </button>
            </div>
          </div>
        </div>
        <ActionsBody {...props} />
      </div>
    </div>
  );
}

function IdentityCard({ myNation, isActive, holdingsValue }: { myNation?: NationData; isActive: boolean; holdingsValue: number }) {
  const meta = myNation ? metaFor(myNation.name) : null;
  const onlinePill = (
    <span className={`pill ${isActive ? 'pill-live' : 'pill-off'}`} style={{ height: 22 }}>
      <span className="dot" />{isActive ? 'Online' : 'Offline'}
    </span>
  );

  if (!myNation) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div className="identity">
          <div className="id-flag">🏳</div>
          <div className="id-main">
            <div className="id-name">Spectator {onlinePill}</div>
            <div className="id-gov">No nation claimed yet</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { l: 'GDP', v: formatGdpShort(myNation.gdp) },
    { l: 'Holdings', v: formatGdpShort(holdingsValue) },
    { l: 'Tax', v: `${Math.round(myNation.taxRate * 100)}%` },
    { l: 'Tech', v: `${Math.round(myNation.technology * 100)}` },
  ];

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="identity">
        <div className="id-flag">{meta?.flag ?? '🏳'}</div>
        <div className="id-main">
          <div className="id-name">{myNation.name} {onlinePill}</div>
          <div className="id-gov">{meta?.govType ?? 'Independent State'}</div>
        </div>
        <div className="id-cash">
          <span className="eyebrow">Cash reserves</span>
          <div className="cash-val tnum">{formatGdpShort(Number(myNation.money))}</div>
        </div>
      </div>
      <div className="id-stats">
        {stats.map((s) => (
          <div className="id-stat" key={s.l}>
            <div className="ids-label">{s.l}</div>
            <div className="ids-value tnum">{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsBody(props: HeaderProps) {
  const { isActive, myNation, status, nameInput, setNameInput, onClaim, onStart, onOpenModal, incomingCount } = props;

  if (!myNation && status === 'Lobby') {
    const countries = allCountryNames().slice().sort((a, b) => a.localeCompare(b));
    return (
      <div className="pregame-panel">
        <select className="select" value={nameInput} onChange={(e) => setNameInput(e.target.value)} aria-label="Choose a country to claim">
          <option value="">Select a country…</option>
          {countries.map((name) => <option key={name} value={name}>{flagFor(name)}  {name}</option>)}
        </select>
        <button className="btn btn-primary btn-block" disabled={!isActive || !nameInput} onClick={() => { if (nameInput) { onClaim(nameInput); setNameInput(''); } }}>
          Claim nation
        </button>
      </div>
    );
  }

  if (!myNation) {
    return <div className="pregame-panel"><div className="pg-empty">Game is {status.toLowerCase()}. Spectating only.</div></div>;
  }

  if (status === 'Lobby') {
    return (
      <div className="pregame-panel">
        <p className="pg-hint">You are <strong>{myNation.name}</strong>. Start the run when everyone&rsquo;s ready.</p>
        <button className="btn btn-primary btn-block" disabled={!isActive} onClick={onStart}>
          <IconPlay size={15} />Start the run
        </button>
      </div>
    );
  }

  if (status === 'Ended') {
    return (
      <div className="pregame-panel">
        <div className="pg-empty">Final GDP <strong style={{ color: 'var(--ink)' }}>{formatGdpShort(myNation.gdp)}</strong> · reset in the footer to replay.</div>
      </div>
    );
  }

  const items: { id: ActionModal; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'trade', icon: <IconExchange />, label: 'Trade', badge: incomingCount },
    { id: 'education', icon: <IconBook />, label: 'Education' },
    { id: 'healthcare', icon: <IconPulse />, label: 'Healthcare' },
    { id: 'military', icon: <IconShield />, label: 'Military' },
    { id: 'technology', icon: <IconCpu />, label: 'Technology' },
    { id: 'taxes', icon: <IconBank />, label: 'Taxes' },
  ];

  return (
    <div className="actions">
      {items.map((it) => {
        const notice = it.id === 'trade' && (it.badge ?? 0) > 0;
        return (
          <button key={it.id} className={`action${notice ? ' notice' : ''}`} disabled={!isActive} onClick={() => onOpenModal(it.id)}>
            {notice && <span className="a-badge">{it.badge}</span>}
            <div className="a-icon">{it.icon}</div>
            <div className="a-label">{it.label}</div>
          </button>
        );
      })}
    </div>
  );
}
