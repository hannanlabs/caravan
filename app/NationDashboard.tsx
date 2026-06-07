'use client';

import { useEffect, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../src/module_bindings';
import type { Infer } from 'spacetimedb';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import TrustRow from '../src/module_bindings/trust_table';
import GdpHistoryRow from '../src/module_bindings/gdp_history_table';
import type { InitialSnapshot, WorldData, NationData } from '../lib/spacetimedb-server';
import { formatGdpShort } from '../lib/format';
import { WorldMap } from './WorldMap';

// Action modals
import { TradeModal } from '../components/TradeModal';
import { EducationModal } from '../components/EducationModal';
import { HealthcareModal } from '../components/HealthcareModal';
import { TaxesModal } from '../components/TaxesModal';
import { StatsModal } from '../components/StatsModal';

// Dashboard layout components
import { Header } from '../components/dashboard/Header';
import { RelationshipCards } from '../components/dashboard/RelationshipCards';
import { MetricsCard } from '../components/dashboard/MetricsCard';
import { WorldEventsCard } from '../components/dashboard/WorldEventsCard';
import { GdpHistoryCard, type MoneyPoint } from '../components/dashboard/GdpHistoryCard';
import { Footer } from '../components/dashboard/Footer';
import { DebugStrip } from '../components/dashboard/DebugStrip';
import type { ActionModal } from '../components/dashboard/types';

type TradeOfferData = Infer<typeof TradeOfferRow>;

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
  const worldShare = myNation && totalGdp > 0 ? (myNation.gdp / totalGdp) * 100 : 0;

  const myHex = identity?.toHexString();
  const incomingOffers: TradeOfferData[] = tradeOffers.filter((o) => o.toOwner.toHexString() === myHex);
  const outgoingOffers: TradeOfferData[] = tradeOffers.filter((o) => o.fromOwner.toHexString() === myHex);

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

      <Footer
        world={world}
        status={status}
        nationCount={nationList.length}
        onReset={() => reset()}
        isActive={isActive}
      />

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
