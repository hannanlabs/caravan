'use client';

import type React from 'react';
import { metaFor } from '../../lib/countries';
import { formatGdpShort, formatMoneyShort } from '../../lib/format';
import type { NationData } from '../../lib/spacetimedb-server';
import type { ActionModal } from './types';

interface HeaderProps {
  isActive: boolean;
  myNation?: NationData;
  status: string;
  nameInput: string;
  setNameInput: (s: string) => void;
  onClaim: (name: string) => void;
  onStart: () => void;
  onOpenModal: (m: ActionModal) => void;
  onViewStats: () => void;
}

export function Header(props: HeaderProps) {
  const { isActive, myNation, status, nameInput, setNameInput,
    onClaim, onStart, onOpenModal, onViewStats } = props;
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
