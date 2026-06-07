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
    return <main style={{ padding: 24 }}>Connecting to SpacetimeDB…</main>;
  }

  const status = world.status.tag;

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720 }}>
      <h1>Caravan</h1>
      <p style={{ color: isActive ? 'green' : 'orange' }}>
        {isActive ? 'Live' : 'Connecting…'} · Year {world.year.toFixed(2)} / 100 · Status:{' '}
        <strong>{status}</strong> · Nations: {nationList.length}
      </p>

      {!myNation && status === 'Lobby' && (
        <section style={{ marginTop: 16 }}>
          <h2>Found your nation</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!nameInput.trim()) return;
              claim({ name: nameInput.trim() });
              setNameInput('');
            }}
          >
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Nation name"
              style={{ padding: 8, marginRight: 8 }}
            />
            <button type="submit" disabled={!isActive || !nameInput.trim()}>
              Claim
            </button>
          </form>
        </section>
      )}

      {!myNation && status !== 'Lobby' && (
        <section style={{ marginTop: 16 }}>
          <p>The game is {status}. You can spectate only.</p>
        </section>
      )}

      {myNation && (
        <section style={{ marginTop: 16 }}>
          <h2>{myNation.name}</h2>
          <ul style={{ lineHeight: 1.7 }}>
            <li>Money: {myNation.money.toString()}</li>
            <li>Goods: {myNation.goods.toString()}</li>
            <li>Energy: {myNation.energy.toString()}</li>
            <li>Education: {(myNation.education * 100).toFixed(1)}%</li>
            <li>Tax rate: {(myNation.taxRate * 100).toFixed(1)}%</li>
          </ul>

          {status === 'Lobby' && (
            <button onClick={() => start()} disabled={!isActive} style={{ padding: 8 }}>
              Start the run
            </button>
          )}

          {status === 'Running' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <button
                onClick={() => invest({ amount: 100n })}
                disabled={!isActive || myNation.money < 100n}
                style={{ padding: 8, width: 240 }}
              >
                Invest 100 in Education
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                Tax rate: {taxInput}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={taxInput}
                  onChange={(e) => setTaxInput(Number(e.target.value))}
                  onMouseUp={() => tax({ rate: taxInput / 100 })}
                  onTouchEnd={() => tax({ rate: taxInput / 100 })}
                  disabled={!isActive}
                />
              </label>
              <button disabled title="Coming Round 4">Propose Trade</button>
              <button disabled title="Coming Round 5">Healthcare</button>
            </div>
          )}

          {status === 'Ended' && (
            <p>
              <strong>Game over.</strong> Final money: {myNation.money.toString()}
            </p>
          )}
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <h2>All nations ({nationList.length})</h2>
        {nationList.length === 0 ? (
          <p>No nations yet.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: 4 }}>Name</th>
                <th style={{ padding: 4 }}>Money</th>
                <th style={{ padding: 4 }}>Education</th>
                <th style={{ padding: 4 }}>Tax</th>
              </tr>
            </thead>
            <tbody>
              {[...nationList]
                .sort((a, b) => (b.money > a.money ? 1 : b.money < a.money ? -1 : 0))
                .map((n) => (
                  <tr key={n.owner.toHexString()}>
                    <td style={{ padding: 4 }}>
                      {n.name}
                      {identity && n.owner.toHexString() === identity.toHexString() && ' (you)'}
                    </td>
                    <td style={{ padding: 4 }}>{n.money.toString()}</td>
                    <td style={{ padding: 4 }}>{(n.education * 100).toFixed(1)}%</td>
                    <td style={{ padding: 4 }}>{(n.taxRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
