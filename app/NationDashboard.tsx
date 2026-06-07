'use client';

import { useEffect, useState } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from '../src/module_bindings';
import type { Infer } from 'spacetimedb';
import TradeOfferRow from '../src/module_bindings/trade_offer_table';
import type { InitialSnapshot, WorldData, NationData } from '../lib/spacetimedb-server';
import { formatGdpShort } from '../lib/format';
import { COMMODITIES, COMMODITY_KEYS } from '../spacetimedb/src/market';
import { WorldMap } from './WorldMap';

import { TradeModal } from '../components/TradeModal';
import { MarketModal } from '../components/MarketModal';
import { EducationModal } from '../components/EducationModal';
import { HealthcareModal } from '../components/HealthcareModal';
import { MilitaryModal } from '../components/MilitaryModal';
import { TechnologyModal } from '../components/TechnologyModal';
import { TaxesModal } from '../components/TaxesModal';
import { StatsModal } from '../components/StatsModal';

import { TopBar } from '../components/dashboard/TopBar';
import { Header } from '../components/dashboard/Header';
import { RelationshipCards } from '../components/dashboard/RelationshipCards';
import { MetricsCard } from '../components/dashboard/MetricsCard';
import { WorldEventsCard } from '../components/dashboard/WorldEventsCard';
import { GdpHistoryCard, type MoneyPoint } from '../components/dashboard/GdpHistoryCard';
import { Footer } from '../components/dashboard/Footer';
import { DebugStrip } from '../components/dashboard/DebugStrip';
import { IconGlobe } from '../components/icons';
import { BrandMark } from '../components/BrandMark';
import type { ActionModal } from '../components/dashboard/types';

type TradeOfferData = Infer<typeof TradeOfferRow>;

interface NationDashboardProps {
  initialSnapshot: InitialSnapshot;
}

export function NationDashboard({ initialSnapshot }: NationDashboardProps) {
  const [debugOn, setDebugOn] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') setDebugOn(new URLSearchParams(window.location.search).has('debug'));
  }, []);

  const { isActive, identity } = useSpacetimeDB();
  const [worlds, worldReady] = useTable(tables.world);
  const [nations, nationsReady] = useTable(tables.nation);
  const [tradeOffers] = useTable(tables.tradeOffer);
  const [trustRows] = useTable(tables.trust);
  const [events] = useTable(tables.worldEvent);
  const [gdpRows] = useTable(tables.gdpHistory);
  const [markets] = useTable(tables.commodityMarket);
  const [stockpiles] = useTable(tables.stockpile);
  const [marketHist] = useTable(tables.marketHistory);
  const [assets] = useTable(tables.asset);

  const claim = useReducer(reducers.claimNation);
  const start = useReducer(reducers.startRun);
  const tax = useReducer(reducers.setTax);
  const propose = useReducer(reducers.proposeTrade);
  const respond = useReducer(reducers.respondTrade);
  const reset = useReducer(reducers.resetGame);
  const buy = useReducer(reducers.buyCommodity);
  const sell = useReducer(reducers.sellCommodity);
  const build = useReducer(reducers.buildAsset);
  const advance = useReducer(reducers.advanceYear);

  const hydrated = isActive && worldReady && nationsReady;
  const world: WorldData | null = hydrated ? (worlds[0] ?? null) : initialSnapshot.world;
  const nationList: readonly NationData[] = hydrated ? nations : [];

  const myHex = identity?.toHexString();
  const myNation = myHex ? nationList.find((n) => n.owner.toHexString() === myHex) : undefined;

  const sortedByGdp = [...nationList].sort((a, b) => b.gdp - a.gdp);
  const totalGdp = nationList.reduce((s, n) => s + n.gdp, 0);
  const myRank = myNation ? sortedByGdp.findIndex((n) => n.owner.toHexString() === myNation.owner.toHexString()) + 1 : 0;
  const worldShare = myNation && totalGdp > 0 ? (myNation.gdp / totalGdp) * 100 : 0;

  const incomingOffers: TradeOfferData[] = tradeOffers.filter((o) => o.toOwner.toHexString() === myHex);
  const outgoingOffers: TradeOfferData[] = tradeOffers.filter((o) => o.fromOwner.toHexString() === myHex);

  const trustOut = new Map<string, number>();
  for (const r of trustRows) if (r.fromOwner.toHexString() === myHex) trustOut.set(r.toOwner.toHexString(), r.value);

  // My commodity holdings + their live market value.
  const priceOf = (c: string) => markets.find((m) => m.commodity === c)?.currentPrice ?? COMMODITIES[c as keyof typeof COMMODITIES]?.basePrice ?? 0;
  const myStock: Record<string, number> = {};
  for (const c of COMMODITY_KEYS) myStock[c] = 0;
  for (const s of stockpiles) if (s.owner.toHexString() === myHex) myStock[s.commodity] = Number(s.amount);
  let holdingsValue = 0;
  for (const c of COMMODITY_KEYS) holdingsValue += (myStock[c] ?? 0) * priceOf(c);

  // My assets.
  const ownedCounts: Record<string, number> = {};
  let assetCount = 0;
  for (const a of assets) {
    if (a.owner.toHexString() === myHex) {
      ownedCounts[a.typeKey] = (ownedCounts[a.typeKey] ?? 0) + 1;
      assetCount++;
    }
  }

  const [nameInput, setNameInput] = useState('');
  const [taxInput, setTaxInput] = useState<number>(10);
  const [openModal, setOpenModal] = useState<ActionModal>(null);

  useEffect(() => {
    if (myNation) setTaxInput(Math.round(myNation.taxRate * 100));
  }, [myNation?.owner.toHexString()]);

  const moneyHistory: MoneyPoint[] = myNation
    ? gdpRows
        .filter((r) => r.owner.toHexString() === myNation.owner.toHexString())
        .map((r) => ({ year: r.year, money: r.gdp }))
        .sort((a, b) => a.year - b.year)
    : [];

  if (!world) {
    return (
      <main className="app">
        {debugOn && (
          <DebugStrip isActive={isActive} worldReady={worldReady} nationsReady={nationsReady} identity={identity}
            worldCount={worlds.length} nationCount={nations.length} tradeCount={tradeOffers.length} trustCount={trustRows.length} />
        )}
        <div className="card card-pad" style={{ margin: 'auto', textAlign: 'center', maxWidth: 420, padding: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><BrandMark size={44} /></div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Connecting to SpacetimeDB…</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>Joining the live world.</div>
        </div>
      </main>
    );
  }

  const status = world.status.tag;
  const leader = sortedByGdp[0];
  const winner = status === 'Ended' ? leader : undefined;

  const toAmount = (n: number) => BigInt(Math.max(0, Math.floor(n)));

  return (
    <main className="app">
      {debugOn && (
        <DebugStrip isActive={isActive} worldReady={worldReady} nationsReady={nationsReady} identity={identity}
          worldCount={worlds.length} nationCount={nations.length} tradeCount={tradeOffers.length} trustCount={trustRows.length} />
      )}

      <TopBar
        world={world}
        status={status}
        nationCount={nationList.length}
        isActive={isActive}
        canAdvance={isActive && status === 'Running' && !!myNation}
        onAdvanceYear={() => advance()}
      />

      {winner && (
        <div className="winner">
          <span className="trophy">🏆</span>
          <span>
            <strong>{winner.name}</strong> wins with GDP {formatGdpShort(winner.gdp)} ·{' '}
            {winner.owner.toHexString() === myHex ? "that's you!" : 'hit Reset in the footer to play again.'}
          </span>
        </div>
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
        incomingCount={incomingOffers.length}
        holdingsValue={holdingsValue}
      />

      <div className="grid">
        <div className="col">
          <RelationshipCards nations={sortedByGdp} identity={identity} trustOut={trustOut}
            winnerHex={winner ? winner.owner.toHexString() : undefined} />
        </div>
        <div className="col">
          <div className="card card-pad map-card">
            <div className="card-title" style={{ marginBottom: 12 }}>
              <span className="ct-label">World map</span>
              <span style={{ color: 'var(--ink-4)', display: 'inline-flex' }}><IconGlobe size={16} /></span>
            </div>
            <WorldMap myNation={myNation} nations={nationList} trustOut={trustOut} />
          </div>
        </div>
        <div className="col">
          <MetricsCard myNation={myNation} />
          <GdpHistoryCard history={moneyHistory} />
          <WorldEventsCard events={events} />
        </div>
      </div>

      <Footer world={world} status={status} nationCount={nationList.length}
        leader={leader ? { name: leader.name, gdpShort: formatGdpShort(leader.gdp) } : undefined}
        onReset={() => reset()} isActive={isActive} />

      <MarketModal
        open={openModal === 'market'}
        onClose={() => setOpenModal(null)}
        isActive={isActive}
        markets={markets}
        history={marketHist}
        stock={myStock}
        onBuy={(c, amt) => buy({ commodity: c, amount: toAmount(amt) })}
        onSell={(c, amt) => sell({ commodity: c, amount: toAmount(amt) })}
      />
      <TradeModal
        open={openModal === 'trade'}
        onClose={() => setOpenModal(null)}
        myNation={myNation}
        nations={nationList}
        isActive={isActive}
        incoming={incomingOffers}
        outgoing={outgoingOffers}
        stock={myStock}
        onPropose={(args) => propose(args)}
        onApprove={(id) => respond({ offerId: id, approve: true })}
        onReject={(id) => respond({ offerId: id, approve: false })}
      />
      <EducationModal open={openModal === 'education'} onClose={() => setOpenModal(null)} isActive={isActive} hasNation={!!myNation}
        money={myNation ? Number(myNation.money) : 0} stock={myStock} ownedCounts={ownedCounts} onBuild={(k) => build({ typeKey: k })} />
      <HealthcareModal open={openModal === 'healthcare'} onClose={() => setOpenModal(null)} isActive={isActive} hasNation={!!myNation}
        money={myNation ? Number(myNation.money) : 0} stock={myStock} ownedCounts={ownedCounts} onBuild={(k) => build({ typeKey: k })} />
      <MilitaryModal open={openModal === 'military'} onClose={() => setOpenModal(null)} isActive={isActive} hasNation={!!myNation}
        money={myNation ? Number(myNation.money) : 0} stock={myStock} ownedCounts={ownedCounts} onBuild={(k) => build({ typeKey: k })} />
      <TechnologyModal open={openModal === 'technology'} onClose={() => setOpenModal(null)} isActive={isActive} hasNation={!!myNation}
        money={myNation ? Number(myNation.money) : 0} stock={myStock} ownedCounts={ownedCounts} onBuild={(k) => build({ typeKey: k })} />
      <TaxesModal open={openModal === 'taxes'} onClose={() => setOpenModal(null)} myNation={myNation} isActive={isActive}
        taxInput={taxInput} setTaxInput={setTaxInput} onSetTax={(rate) => tax({ rate })} />
      <StatsModal open={openModal === 'stats'} onClose={() => setOpenModal(null)} myNation={myNation}
        rank={myRank} worldShare={worldShare} nationCount={nationList.length}
        stock={myStock} holdingsValue={holdingsValue} assetCount={assetCount} />
    </main>
  );
}
