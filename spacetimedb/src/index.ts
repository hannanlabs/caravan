import {
  schema,
  table,
  t,
  SenderError,
  type InferSchema,
  type ReducerCtx,
} from 'spacetimedb/server';
import { Identity } from 'spacetimedb';
import {
  COMMODITY_KEYS,
  COMMODITIES,
  ASSET_BY_KEY,
  productionFor,
  startingStockpile,
  supplyDemandMultiplier,
  computeScarcity,
  scarcityMultiplier,
  computeVolatility,
  volatilityMultiplier,
  eventActive,
  priceCycle,
  computeTargetPrice,
  smoothPrice,
  clampPrice,
  priceImpact,
  decayVolume,
  costOf,
  canAfford,
  canSell,
  canBuildAsset,
  aggregateTailwinds,
  taxHarvest,
  consumptionFor,
  shortagePenalty,
  computeGdpValue,
  warSeverity,
  warAttrition,
  WAR_MONEY_COST,
  WAR_MATERIEL,
  WAR_STAT_DRAG,
  WAR_MARKET_DEMAND,
  WAR_DECLARE_COST,
  WAR_TRUST_HIT,
  assetsForCategory,
  desiredStockpile,
  surplusToSell,
  deficitToBuy,
  weakestStat,
  tradeIsFavourable,
  pickSurplusCommodity,
  pickDeficitCommodity,
  BOT_RESERVE_MONEY,
  type CommodityKey,
  type OwnedAsset,
  type StatKey,
} from './market';

const WorldStatus = t.enum('WorldStatus', {
  lobby: t.unit(),
  running: t.unit(),
  ended: t.unit(),
});

const world = table(
  { name: 'world', public: true },
  {
    id: t.u8().primaryKey(),
    year: t.f32(),
    status: WorldStatus,
  }
);

// Nation: money + the 0..1 development stats + score. Commodity holdings live in
// the `stockpile` table (unified resource economy), not as columns here.
const nation = table(
  { name: 'nation', public: true },
  {
    owner: t.identity().primaryKey(),
    name: t.string(),
    money: t.u64(),
    education: t.f32(),
    taxRate: t.f32(),
    health: t.f32(),
    military: t.f32(),
    technology: t.f32(),
    gdp: t.f64(),
    bot: t.bool(),
  }
);

// Per-nation, per-commodity holdings.
const stockpile = table(
  {
    name: 'stockpile',
    public: true,
    indexes: [
      { accessor: 'by_owner', algorithm: 'btree', columns: ['owner'] },
      { accessor: 'by_owner_commodity', algorithm: 'btree', columns: ['owner', 'commodity'] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    commodity: t.string(),
    amount: t.u64(),
  }
);

// Per-nation, per-commodity yearly production (geography endowment / comparative advantage).
const production = table(
  {
    name: 'production',
    public: true,
    indexes: [{ accessor: 'by_owner', algorithm: 'btree', columns: ['owner'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    commodity: t.string(),
    perYear: t.u64(),
  }
);

// Live commodity market — one row per commodity.
const commodityMarket = table(
  { name: 'commodity_market', public: true },
  {
    commodity: t.string().primaryKey(),
    basePrice: t.f64(),
    currentPrice: t.f64(),
    previousPrice: t.f64(),
    priceChange: t.f64(),
    priceChangePercent: t.f64(),
    globalSupply: t.f64(),
    globalDemand: t.f64(),
    scarcityLevel: t.f32(),
    recentBuyVolume: t.f64(),
    recentSellVolume: t.f64(),
    volatility: t.f32(),
    eventMultiplier: t.f32(),
    crisisUntilYear: t.f32(),
    lastUpdatedYear: t.f32(),
  }
);

// Bounded price history for sparklines / volatility.
const marketHistory = table(
  {
    name: 'market_history',
    public: true,
    indexes: [{ accessor: 'by_commodity', algorithm: 'btree', columns: ['commodity'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    commodity: t.string(),
    year: t.f32(),
    price: t.f64(),
  }
);

// Built capital assets (one row per purchase, for per-asset ramp).
const asset = table(
  {
    name: 'asset',
    public: true,
    indexes: [{ accessor: 'by_owner', algorithm: 'btree', columns: ['owner'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    typeKey: t.string(),
    builtYear: t.f32(),
  }
);

// Active and historical wars between nations.
const war = table(
  { name: 'war', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    attacker: t.identity(),
    defender: t.identity(),
    startYear: t.f32(),
    active: t.bool(),
  }
);

const tradeOffer = table(
  { name: 'trade_offer', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    fromOwner: t.identity().index('btree'),
    toOwner: t.identity().index('btree'),
    giveCommodity: t.string(),
    giveAmount: t.u64(),
    getCommodity: t.string(),
    getAmount: t.u64(),
    createdAt: t.timestamp(),
  }
);

const trust = table(
  {
    name: 'trust',
    public: true,
    indexes: [{ accessor: 'by_pair', algorithm: 'btree', columns: ['fromOwner', 'toOwner'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    fromOwner: t.identity(),
    toOwner: t.identity(),
    value: t.u8(),
  }
);

const worldEvent = table(
  { name: 'world_event', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    year: t.f32(),
    createdAt: t.timestamp(),
    actorName: t.string(),
    text: t.string(),
  }
);

const gdpHistory = table(
  {
    name: 'gdp_history',
    public: true,
    indexes: [{ accessor: 'by_owner', algorithm: 'btree', columns: ['owner'] }],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity(),
    year: t.f32(),
    gdp: t.f64(),
  }
);

const spacetimedb = schema({
  world, nation, stockpile, production, commodityMarket, marketHistory, asset,
  war, tradeOffer, trust, worldEvent, gdpHistory,
});
export default spacetimedb;

// ---------- constants ----------
const STARTING_MONEY = 2000n;
const STARTING_EDUCATION = 0.1;
const STARTING_TAX = 0.1;
const STARTING_HEALTH = 0.2;
const STARTING_MILITARY = 0.1;
const STARTING_TECHNOLOGY = 0.1;
const GAME_END_YEAR = 100;
const HISTORY_CAP = 80;
const MAX_EVENTS = 200;

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const toBig = (n: number) => BigInt(Math.max(0, Math.round(n)));

function isCommodity(key: string): key is CommodityKey {
  return (COMMODITY_KEYS as string[]).includes(key);
}

function getWorld(ctx: Ctx) {
  const w = ctx.db.world.id.find(0);
  if (!w) throw new Error('world not initialized');
  return w;
}

function requireMyNation(ctx: Ctx) {
  const n = ctx.db.nation.owner.find(ctx.sender);
  if (!n) throw new SenderError('not a participant — claim a nation first');
  return n;
}

function requireRunning(ctx: Ctx) {
  const w = getWorld(ctx);
  if (w.status.tag !== 'running') throw new Error(`world is ${w.status.tag}, not running`);
  return w;
}

// ---------- stockpile helpers ----------
function findStockpile(ctx: Ctx, owner: Identity, commodity: string) {
  return [...ctx.db.stockpile.by_owner_commodity.filter([owner, commodity])][0];
}

function stockpileAmount(ctx: Ctx, owner: Identity, commodity: string): bigint {
  return findStockpile(ctx, owner, commodity)?.amount ?? 0n;
}

function addStockpile(ctx: Ctx, owner: Identity, commodity: string, delta: bigint) {
  const existing = findStockpile(ctx, owner, commodity);
  if (existing) {
    const next = existing.amount + delta;
    ctx.db.stockpile.id.update({ ...existing, amount: next < 0n ? 0n : next });
  } else if (delta > 0n) {
    ctx.db.stockpile.insert({ id: 0n, owner, commodity, amount: delta });
  }
}

function stockpileMapNumber(ctx: Ctx, owner: Identity): Record<CommodityKey, number> {
  const out = {} as Record<CommodityKey, number>;
  for (const c of COMMODITY_KEYS) out[c] = 0;
  for (const row of ctx.db.stockpile.by_owner.filter(owner)) {
    if (isCommodity(row.commodity)) out[row.commodity] = Number(row.amount);
  }
  return out;
}

function ownedAssets(ctx: Ctx, owner: Identity): OwnedAsset[] {
  return [...ctx.db.asset.by_owner.filter(owner)].map((a) => ({ typeKey: a.typeKey, builtYear: a.builtYear }));
}

function marketPrice(ctx: Ctx, commodity: string): number {
  return ctx.db.commodityMarket.commodity.find(commodity)?.currentPrice ?? COMMODITIES[commodity as CommodityKey]?.basePrice ?? 0;
}

// Live market value of a nation's holdings.
function resourceValueOf(ctx: Ctx, owner: Identity): number {
  let total = 0;
  for (const row of ctx.db.stockpile.by_owner.filter(owner)) {
    total += Number(row.amount) * marketPrice(ctx, row.commodity);
  }
  return total;
}

// Total war-severity dragging a nation's GDP this `year` (sum over active wars).
function warSeverityFor(ctx: Ctx, owner: Identity, year: number): number {
  const hex = owner.toHexString();
  let total = 0;
  for (const wr of ctx.db.war.iter()) {
    if (!wr.active) continue;
    let enemy: Identity | null = null;
    if (wr.attacker.toHexString() === hex) enemy = wr.defender;
    else if (wr.defender.toHexString() === hex) enemy = wr.attacker;
    if (!enemy) continue;
    const me = ctx.db.nation.owner.find(owner);
    const en = ctx.db.nation.owner.find(enemy);
    if (!me || !en) continue;
    total += warSeverity(year - wr.startYear, me.military, en.military);
  }
  return total;
}

// Recompute and store a nation's GDP from stats + holdings value + asset tailwinds + war drag.
function recomputeNationGdp(ctx: Ctx, n: ReturnType<typeof requireMyNation>): number {
  const w = getWorld(ctx);
  const tailwind = aggregateTailwinds(ownedAssets(ctx, n.owner), w.year);
  const gdp = computeGdpValue(
    { education: n.education, taxRate: n.taxRate, health: n.health, military: n.military, technology: n.technology },
    resourceValueOf(ctx, n.owner),
    tailwind.gdp,
    warSeverityFor(ctx, n.owner, w.year)
  );
  ctx.db.nation.owner.update({ ...n, gdp });
  return gdp;
}

// ---------- trust ----------
const TRUST_START = 50;
function clampTrust(v: number) { return Math.max(0, Math.min(100, v)); }
function bumpTrust(ctx: Ctx, from: Identity, to: Identity, delta: number) {
  const existing = [...ctx.db.trust.by_pair.filter([from, to])][0];
  if (existing) {
    ctx.db.trust.id.update({ ...existing, value: clampTrust(existing.value + delta) });
  } else {
    ctx.db.trust.insert({ id: 0n, fromOwner: from, toOwner: to, value: clampTrust(TRUST_START + delta) });
  }
}

// ---------- events ----------
function logEvent(ctx: Ctx, actorName: string, text: string) {
  const w = getWorld(ctx);
  ctx.db.worldEvent.insert({ id: 0n, year: w.year, createdAt: ctx.timestamp, actorName, text });
  const all = [...ctx.db.worldEvent.iter()];
  if (all.length > MAX_EVENTS) {
    const sorted = all.sort((a, b) => (a.id < b.id ? -1 : 1));
    for (let i = 0; i < sorted.length - MAX_EVENTS; i++) ctx.db.worldEvent.id.delete(sorted[i]!.id);
  }
}

// ---------- market seeding & history ----------
function seedMarkets(ctx: Ctx) {
  for (const c of COMMODITY_KEYS) {
    const def = COMMODITIES[c];
    ctx.db.commodityMarket.insert({
      commodity: c,
      basePrice: def.basePrice,
      currentPrice: def.basePrice,
      previousPrice: def.basePrice,
      priceChange: 0,
      priceChangePercent: 0,
      globalSupply: def.baseSupply,
      globalDemand: def.baseDemand,
      scarcityLevel: 0,
      recentBuyVolume: 0,
      recentSellVolume: 0,
      volatility: 0,
      eventMultiplier: 1,
      crisisUntilYear: 0,
      lastUpdatedYear: 0,
    });
    ctx.db.marketHistory.insert({ id: 0n, commodity: c, year: 0, price: def.basePrice });
  }
}

function recentPrices(ctx: Ctx, commodity: string, limit = 12): number[] {
  return [...ctx.db.marketHistory.by_commodity.filter(commodity)]
    .sort((a, b) => a.year - b.year)
    .slice(-limit)
    .map((h) => h.price);
}

function pushHistory(ctx: Ctx, commodity: string, year: number, price: number) {
  ctx.db.marketHistory.insert({ id: 0n, commodity, year, price });
  const all = [...ctx.db.marketHistory.by_commodity.filter(commodity)];
  if (all.length > HISTORY_CAP) {
    const sorted = all.sort((a, b) => (a.id < b.id ? -1 : 1));
    for (let i = 0; i < sorted.length - HISTORY_CAP; i++) ctx.db.marketHistory.id.delete(sorted[i]!.id);
  }
}

// ---------- nation seeding ----------
function seedNationEconomy(ctx: Ctx, owner: Identity, name: string) {
  const prod = productionFor(name);
  const stock = startingStockpile(name);
  for (const c of COMMODITY_KEYS) {
    ctx.db.production.insert({ id: 0n, owner, commodity: c, perYear: toBig(prod[c]) });
    ctx.db.stockpile.insert({ id: 0n, owner, commodity: c, amount: toBig(stock[c]) });
  }
}

function seedNationGdp(name: string, stats: { education: number; taxRate: number; health: number; military: number; technology: number }): number {
  const stock = startingStockpile(name);
  let resourceValue = 0;
  for (const c of COMMODITY_KEYS) resourceValue += stock[c] * COMMODITIES[c].basePrice;
  return computeGdpValue(stats, resourceValue, 0);
}

interface SeedNation {
  hex: string; name: string; education: number; taxRate: number; health: number; military: number; technology: number;
}
const hex = (n: number) => ('bb' + n.toString(16).padStart(2, '0')).padEnd(64, '0');

const SEED_NATIONS: SeedNation[] = [
  { hex: hex(1),  name: 'USA',            education: 0.85, taxRate: 0.27, health: 0.80, military: 0.95, technology: 0.92 },
  { hex: hex(2),  name: 'China',          education: 0.70, taxRate: 0.30, health: 0.70, military: 0.85, technology: 0.80 },
  { hex: hex(3),  name: 'Germany',        education: 0.88, taxRate: 0.38, health: 0.88, military: 0.55, technology: 0.88 },
  { hex: hex(4),  name: 'Japan',          education: 0.90, taxRate: 0.32, health: 0.95, military: 0.50, technology: 0.90 },
  { hex: hex(5),  name: 'India',          education: 0.45, taxRate: 0.18, health: 0.55, military: 0.65, technology: 0.55 },
  { hex: hex(6),  name: 'United Kingdom', education: 0.85, taxRate: 0.35, health: 0.85, military: 0.70, technology: 0.82 },
  { hex: hex(7),  name: 'France',         education: 0.82, taxRate: 0.45, health: 0.90, military: 0.72, technology: 0.80 },
  { hex: hex(8),  name: 'Italy',          education: 0.75, taxRate: 0.42, health: 0.82, military: 0.45, technology: 0.70 },
  { hex: hex(9),  name: 'Brazil',         education: 0.50, taxRate: 0.22, health: 0.65, military: 0.45, technology: 0.50 },
  { hex: hex(10), name: 'Canada',         education: 0.85, taxRate: 0.31, health: 0.88, military: 0.45, technology: 0.80 },
  { hex: hex(11), name: 'Pakistan',       education: 0.40, taxRate: 0.13, health: 0.50, military: 0.60, technology: 0.35 },
  { hex: hex(12), name: 'Bangladesh',     education: 0.42, taxRate: 0.12, health: 0.55, military: 0.35, technology: 0.35 },
  { hex: hex(13), name: 'South Korea',    education: 0.92, taxRate: 0.27, health: 0.90, military: 0.68, technology: 0.90 },
  { hex: hex(14), name: 'Indonesia',      education: 0.50, taxRate: 0.16, health: 0.60, military: 0.45, technology: 0.45 },
  { hex: hex(15), name: 'Vietnam',        education: 0.55, taxRate: 0.20, health: 0.65, military: 0.50, technology: 0.45 },
  { hex: hex(16), name: 'Saudi Arabia',   education: 0.60, taxRate: 0.05, health: 0.72, military: 0.55, technology: 0.55 },
  { hex: hex(17), name: 'Turkey',         education: 0.62, taxRate: 0.24, health: 0.68, military: 0.62, technology: 0.55 },
  { hex: hex(18), name: 'Iran',           education: 0.55, taxRate: 0.15, health: 0.65, military: 0.58, technology: 0.45 },
  { hex: hex(19), name: 'Israel',         education: 0.88, taxRate: 0.28, health: 0.87, military: 0.80, technology: 0.90 },
  { hex: hex(20), name: 'Russia',         education: 0.65, taxRate: 0.20, health: 0.62, military: 0.90, technology: 0.65 },
  { hex: hex(21), name: 'Spain',          education: 0.78, taxRate: 0.37, health: 0.85, military: 0.45, technology: 0.70 },
  { hex: hex(22), name: 'Poland',         education: 0.75, taxRate: 0.34, health: 0.78, military: 0.55, technology: 0.62 },
  { hex: hex(23), name: 'Mexico',         education: 0.55, taxRate: 0.17, health: 0.70, military: 0.38, technology: 0.50 },
  { hex: hex(24), name: 'Nigeria',        education: 0.30, taxRate: 0.08, health: 0.40, military: 0.40, technology: 0.30 },
  { hex: hex(25), name: 'South Africa',   education: 0.58, taxRate: 0.27, health: 0.60, military: 0.42, technology: 0.50 },
  { hex: hex(26), name: 'Australia',      education: 0.85, taxRate: 0.30, health: 0.88, military: 0.55, technology: 0.80 },
];

function seedWorld(ctx: Ctx) {
  seedMarkets(ctx);
  for (const s of SEED_NATIONS) {
    const owner = Identity.fromString(s.hex);
    const stats = { education: s.education, taxRate: s.taxRate, health: s.health, military: s.military, technology: s.technology };
    const gdp = seedNationGdp(s.name, stats);
    ctx.db.nation.insert({ owner, name: s.name, money: STARTING_MONEY, ...stats, gdp, bot: true });
    seedNationEconomy(ctx, owner, s.name);
    ctx.db.gdpHistory.insert({ id: 0n, owner, year: 0, gdp });
  }
}

export const init = spacetimedb.init((ctx) => {
  ctx.db.world.insert({ id: 0, year: 0, status: { tag: 'lobby' } });
  seedWorld(ctx);
});

export const onConnect = spacetimedb.clientConnected((_ctx) => {});
export const onDisconnect = spacetimedb.clientDisconnected((_ctx) => {});

export const claimNation = spacetimedb.reducer({ name: t.string() }, (ctx, { name }) => {
  const w = getWorld(ctx);
  if (w.status.tag !== 'lobby') throw new Error('lobby is closed');
  if (ctx.db.nation.owner.find(ctx.sender)) throw new Error('already claimed a nation');

  const existing = [...ctx.db.nation.iter()].find((n) => n.name === name);
  if (existing) {
    // Take over a seeded bot: re-point its nation, stockpiles, production, assets, history.
    for (const h of [...ctx.db.gdpHistory.by_owner.filter(existing.owner)]) ctx.db.gdpHistory.id.update({ ...h, owner: ctx.sender });
    for (const s of [...ctx.db.stockpile.by_owner.filter(existing.owner)]) ctx.db.stockpile.id.update({ ...s, owner: ctx.sender });
    for (const p of [...ctx.db.production.by_owner.filter(existing.owner)]) ctx.db.production.id.update({ ...p, owner: ctx.sender });
    for (const a of [...ctx.db.asset.by_owner.filter(existing.owner)]) ctx.db.asset.id.update({ ...a, owner: ctx.sender });
    for (const wr of [...ctx.db.war.iter()]) {
      if (wr.attacker.toHexString() === existing.owner.toHexString()) ctx.db.war.id.update({ ...wr, attacker: ctx.sender });
      else if (wr.defender.toHexString() === existing.owner.toHexString()) ctx.db.war.id.update({ ...wr, defender: ctx.sender });
    }
    ctx.db.nation.owner.delete(existing.owner);
    const taken = { ...existing, owner: ctx.sender, bot: false };
    ctx.db.nation.insert(taken);
    recomputeNationGdp(ctx, taken);
    logEvent(ctx, name, `${name} joined the world.`);
    return;
  }

  const stats = { education: STARTING_EDUCATION, taxRate: STARTING_TAX, health: STARTING_HEALTH, military: STARTING_MILITARY, technology: STARTING_TECHNOLOGY };
  const gdp = seedNationGdp(name, stats);
  ctx.db.nation.insert({ owner: ctx.sender, name, money: STARTING_MONEY, ...stats, gdp, bot: false });
  seedNationEconomy(ctx, ctx.sender, name);
  ctx.db.gdpHistory.insert({ id: 0n, owner: ctx.sender, year: 0, gdp });
  logEvent(ctx, name, `${name} joined the world.`);
});

export const startRun = spacetimedb.reducer((ctx) => {
  const w = getWorld(ctx);
  if (w.status.tag !== 'lobby') throw new Error('already started');
  const me = requireMyNation(ctx);
  ctx.db.world.id.update({ ...w, status: { tag: 'running' } });
  logEvent(ctx, 'System', `🏁 The simulation begins. ${me.name} hit Start.`);
});

export const setTax = spacetimedb.reducer({ rate: t.f32() }, (ctx, { rate }) => {
  requireRunning(ctx);
  const n = requireMyNation(ctx);
  const clamped = clamp01(rate);
  const updated = { ...n, taxRate: clamped };
  ctx.db.nation.owner.update(updated);
  recomputeNationGdp(ctx, updated);
  logEvent(ctx, n.name, `🏛 ${n.name} set tax rate to ${(clamped * 100).toFixed(0)}%.`);
});

// ============================================================
// Owner-parameterized action helpers — shared by the public reducers (passing
// ctx.sender) and the bot engine (passing a bot's owner). Helpers still THROW on
// invalid input (reducers rely on that for client feedback); the bot engine
// pre-validates with pure guards so it never triggers a throw inside settleYear.
// ============================================================
function marketBuy(ctx: Ctx, owner: Identity, commodity: string, amount: bigint): bigint {
  const n = ctx.db.nation.owner.find(owner);
  if (!n) throw new SenderError('not a participant — claim a nation first');
  if (!isCommodity(commodity)) throw new Error('unknown commodity');
  if (amount <= 0n) throw new Error('amount must be > 0');
  const m = ctx.db.commodityMarket.commodity.find(commodity);
  if (!m) throw new Error('market not found');
  const amt = Number(amount);
  if (!canAfford(Number(n.money), m.currentPrice, amt)) throw new Error('insufficient money');
  const cost = toBig(costOf(m.currentPrice, amt));
  ctx.db.nation.owner.update({ ...n, money: n.money - cost });
  addStockpile(ctx, owner, commodity, amount);
  const nextPrice = clampPrice(m.currentPrice + priceImpact(m.currentPrice, amt, m.globalSupply, 'buy'), m.basePrice, eventActive(m.crisisUntilYear, getWorld(ctx).year));
  ctx.db.commodityMarket.commodity.update({ ...m, recentBuyVolume: m.recentBuyVolume + amt, currentPrice: nextPrice });
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(owner)!);
  return cost;
}

function marketSell(ctx: Ctx, owner: Identity, commodity: string, amount: bigint): bigint {
  const n = ctx.db.nation.owner.find(owner);
  if (!n) throw new SenderError('not a participant — claim a nation first');
  if (!isCommodity(commodity)) throw new Error('unknown commodity');
  if (amount <= 0n) throw new Error('amount must be > 0');
  const m = ctx.db.commodityMarket.commodity.find(commodity);
  if (!m) throw new Error('market not found');
  if (!canSell(Number(stockpileAmount(ctx, owner, commodity)), Number(amount))) throw new Error('insufficient stockpile');
  const amt = Number(amount);
  const revenue = toBig(costOf(m.currentPrice, amt));
  addStockpile(ctx, owner, commodity, -amount);
  ctx.db.nation.owner.update({ ...n, money: n.money + revenue });
  const nextPrice = clampPrice(m.currentPrice + priceImpact(m.currentPrice, amt, m.globalSupply, 'sell'), m.basePrice, eventActive(m.crisisUntilYear, getWorld(ctx).year));
  ctx.db.commodityMarket.commodity.update({ ...m, recentSellVolume: m.recentSellVolume + amt, currentPrice: nextPrice });
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(owner)!);
  return revenue;
}

function doBuildAsset(ctx: Ctx, owner: Identity, typeKey: string) {
  const w = getWorld(ctx);
  const n = ctx.db.nation.owner.find(owner);
  if (!n) throw new SenderError('not a participant — claim a nation first');
  const def = ASSET_BY_KEY[typeKey];
  if (!def) throw new Error('unknown asset');
  const check = canBuildAsset(Number(n.money), stockpileMapNumber(ctx, owner), def);
  if (!check.ok) throw new Error(`cannot build ${def.label}: missing ${check.missing}`);
  ctx.db.nation.owner.update({ ...n, money: n.money - toBig(def.costMoney) });
  for (const c of def.costs) addStockpile(ctx, owner, c.commodity, -toBig(c.amount));
  ctx.db.asset.insert({ id: 0n, owner, typeKey, builtYear: w.year });
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(owner)!);
  return def;
}

function doProposeTrade(ctx: Ctx, from: Identity, to: Identity, giveCommodity: string, giveAmount: bigint, getCommodity: string, getAmount: bigint) {
  if (to.toHexString() === from.toHexString()) throw new Error('cannot trade with yourself');
  if (!isCommodity(giveCommodity) || !isCommodity(getCommodity)) throw new Error('unknown commodity');
  if (!ctx.db.nation.owner.find(to)) throw new Error('target nation does not exist');
  if (giveAmount <= 0n || getAmount <= 0n) throw new Error('amounts must be > 0');
  if (stockpileAmount(ctx, from, giveCommodity) < giveAmount) throw new Error(`insufficient ${giveCommodity} to offer`);
  ctx.db.tradeOffer.insert({ id: 0n, fromOwner: from, toOwner: to, giveCommodity, giveAmount, getCommodity, getAmount, createdAt: ctx.timestamp });
}

function doRespondTrade(ctx: Ctx, responder: Identity, offerId: bigint, approve: boolean) {
  const offer = ctx.db.tradeOffer.id.find(offerId);
  if (!offer) throw new Error('offer not found');
  if (offer.toOwner.toHexString() !== responder.toHexString()) throw new SenderError('only the recipient can respond');

  if (!approve) {
    bumpTrust(ctx, offer.fromOwner, offer.toOwner, -5);
    const p = ctx.db.nation.owner.find(offer.fromOwner);
    const r = ctx.db.nation.owner.find(offer.toOwner);
    if (p && r) logEvent(ctx, r.name, `❌ ${r.name} rejected ${p.name}'s trade.`);
    ctx.db.tradeOffer.id.delete(offerId);
    return;
  }

  const proposer = ctx.db.nation.owner.find(offer.fromOwner);
  const responderN = ctx.db.nation.owner.find(offer.toOwner);
  if (!proposer || !responderN) throw new Error('a party no longer exists');
  if (stockpileAmount(ctx, offer.fromOwner, offer.giveCommodity) < offer.giveAmount) throw new Error('proposer can no longer cover the offer');
  if (stockpileAmount(ctx, offer.toOwner, offer.getCommodity) < offer.getAmount) throw new Error('you do not have enough to fulfil the offer');

  addStockpile(ctx, offer.fromOwner, offer.giveCommodity, -offer.giveAmount);
  addStockpile(ctx, offer.toOwner, offer.giveCommodity, offer.giveAmount);
  addStockpile(ctx, offer.toOwner, offer.getCommodity, -offer.getAmount);
  addStockpile(ctx, offer.fromOwner, offer.getCommodity, offer.getAmount);
  bumpTrust(ctx, offer.fromOwner, offer.toOwner, 5);
  bumpTrust(ctx, offer.toOwner, offer.fromOwner, 5);
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(offer.fromOwner)!);
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(offer.toOwner)!);
  logEvent(ctx, responderN.name, `✅ ${responderN.name} accepted ${proposer.name}'s trade · ${offer.giveAmount} ${offer.giveCommodity} ↔ ${offer.getAmount} ${offer.getCommodity}.`);
  ctx.db.tradeOffer.id.delete(offerId);
}

function activeWarBetween(ctx: Ctx, a: string, b: string): boolean {
  for (const wr of ctx.db.war.iter()) {
    if (!wr.active) continue;
    const x = wr.attacker.toHexString(), y = wr.defender.toHexString();
    if ((x === a && y === b) || (x === b && y === a)) return true;
  }
  return false;
}

function doDeclareWar(ctx: Ctx, attacker: Identity, target: Identity) {
  const w = getWorld(ctx);
  const me = ctx.db.nation.owner.find(attacker);
  if (!me) throw new SenderError('not a participant — claim a nation first');
  if (target.toHexString() === attacker.toHexString()) throw new Error('cannot declare war on yourself');
  const enemy = ctx.db.nation.owner.find(target);
  if (!enemy) throw new Error('target nation does not exist');
  if (activeWarBetween(ctx, attacker.toHexString(), target.toHexString())) throw new Error('already at war with them');
  ctx.db.war.insert({ id: 0n, attacker, defender: target, startYear: w.year, active: true });
  ctx.db.nation.owner.update({ ...me, money: me.money > toBig(WAR_DECLARE_COST) ? me.money - toBig(WAR_DECLARE_COST) : 0n });
  bumpTrust(ctx, attacker, target, -WAR_TRUST_HIT);
  bumpTrust(ctx, target, attacker, -WAR_TRUST_HIT);
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(attacker)!);
  recomputeNationGdp(ctx, ctx.db.nation.owner.find(target)!);
  logEvent(ctx, me.name, `⚔ ${me.name} declared war on ${enemy.name}.`);
}

function doMakePeace(ctx: Ctx, actor: Identity, warId: bigint) {
  const wr = ctx.db.war.id.find(warId);
  if (!wr || !wr.active) throw new Error('war not found');
  const hex = actor.toHexString();
  if (wr.attacker.toHexString() !== hex && wr.defender.toHexString() !== hex) throw new SenderError('not a belligerent in this war');
  ctx.db.war.id.update({ ...wr, active: false });
  bumpTrust(ctx, wr.attacker, wr.defender, 10);
  bumpTrust(ctx, wr.defender, wr.attacker, 10);
  const a = ctx.db.nation.owner.find(wr.attacker);
  const d = ctx.db.nation.owner.find(wr.defender);
  if (a) recomputeNationGdp(ctx, a);
  if (d) recomputeNationGdp(ctx, d);
  if (a && d) logEvent(ctx, a.name, `🕊 ${a.name} and ${d.name} signed peace.`);
}

// ---------- public reducers (thin wrappers over the helpers) ----------
export const buyCommodity = spacetimedb.reducer({ commodity: t.string(), amount: t.u64() }, (ctx, { commodity, amount }) => {
  requireRunning(ctx);
  requireMyNation(ctx);
  const cost = marketBuy(ctx, ctx.sender, commodity, amount);
  const n = ctx.db.nation.owner.find(ctx.sender)!;
  logEvent(ctx, n.name, `📈 ${n.name} bought ${Number(amount)} ${commodity} for $${Number(cost)}M.`);
});

export const sellCommodity = spacetimedb.reducer({ commodity: t.string(), amount: t.u64() }, (ctx, { commodity, amount }) => {
  requireRunning(ctx);
  requireMyNation(ctx);
  const revenue = marketSell(ctx, ctx.sender, commodity, amount);
  const n = ctx.db.nation.owner.find(ctx.sender)!;
  logEvent(ctx, n.name, `📉 ${n.name} sold ${Number(amount)} ${commodity} for $${Number(revenue)}M.`);
});

export const buildAsset = spacetimedb.reducer({ typeKey: t.string() }, (ctx, { typeKey }) => {
  requireRunning(ctx);
  const n = requireMyNation(ctx);
  const def = doBuildAsset(ctx, ctx.sender, typeKey);
  logEvent(ctx, n.name, `🏗 ${n.name} built a ${def.label}.`);
});

export const proposeTrade = spacetimedb.reducer(
  { to: t.identity(), giveCommodity: t.string(), giveAmount: t.u64(), getCommodity: t.string(), getAmount: t.u64() },
  (ctx, { to, giveCommodity, giveAmount, getCommodity, getAmount }) => {
    requireRunning(ctx);
    const me = requireMyNation(ctx);
    doProposeTrade(ctx, ctx.sender, to, giveCommodity, giveAmount, getCommodity, getAmount);
    const cp = ctx.db.nation.owner.find(to);
    logEvent(ctx, me.name, `🤝 ${me.name} offered ${cp?.name ?? '?'}: ${giveAmount} ${giveCommodity} for ${getAmount} ${getCommodity}.`);
  }
);

export const respondTrade = spacetimedb.reducer({ offerId: t.u64(), approve: t.bool() }, (ctx, { offerId, approve }) => {
  requireRunning(ctx);
  doRespondTrade(ctx, ctx.sender, offerId, approve);
});

export const declareWar = spacetimedb.reducer({ target: t.identity() }, (ctx, { target }) => {
  requireRunning(ctx);
  requireMyNation(ctx);
  doDeclareWar(ctx, ctx.sender, target);
});

export const makePeace = spacetimedb.reducer({ warId: t.u64() }, (ctx, { warId }) => {
  requireRunning(ctx);
  doMakePeace(ctx, ctx.sender, warId);
});

// ============================================================
// Bot AI — each bot nation takes a turn during settlement. Every action is
// pre-validated with pure guards AND wrapped in try/catch, so a bot can never
// abort the Advance Year transaction.
// ============================================================
const BOT_PROPOSE_CHANCE = 0.3;
const BOT_WAR_CHANCE = 0.015;
const BOT_MAX_ACTIVE_WARS = 4;

function trustValue(ctx: Ctx, from: Identity, to: Identity): number {
  return [...ctx.db.trust.by_pair.filter([from, to])][0]?.value ?? 50;
}

function botPriceOf(ctx: Ctx): (c: CommodityKey) => number {
  return (c) => ctx.db.commodityMarket.commodity.find(c)?.currentPrice ?? COMMODITIES[c].basePrice;
}

function activeWarsCount(ctx: Ctx): number {
  let n = 0;
  for (const wr of ctx.db.war.iter()) if (wr.active) n++;
  return n;
}

function runBots(ctx: Ctx, year: number) {
  const priceOf = botPriceOf(ctx);
  const bots = [...ctx.db.nation.iter()].filter((n) => n.bot).sort((a, b) => (a.owner.toHexString() < b.owner.toHexString() ? -1 : 1));

  for (const bot of bots) {
    const owner = bot.owner;
    try {
      // a. answer incoming offers
      for (const offer of [...ctx.db.tradeOffer.iter()].filter((o) => o.toOwner.toHexString() === owner.toHexString())) {
        if (!isCommodity(offer.giveCommodity) || !isCommodity(offer.getCommodity)) continue;
        const canFulfil = stockpileAmount(ctx, owner, offer.getCommodity) >= offer.getAmount;
        const proposerCovers = stockpileAmount(ctx, offer.fromOwner, offer.giveCommodity) >= offer.giveAmount;
        const fair = tradeIsFavourable(offer.giveCommodity, Number(offer.giveAmount), offer.getCommodity, Number(offer.getAmount), priceOf);
        const trust = trustValue(ctx, owner, offer.fromOwner);
        if (canFulfil && proposerCovers && fair && trust > 15) doRespondTrade(ctx, owner, offer.id, true);
        else doRespondTrade(ctx, owner, offer.id, false);
      }

      // b. market rebalance (sell biggest surplus, buy biggest deficit)
      let stocks = stockpileMapNumber(ctx, owner);
      const sellC = pickSurplusCommodity(stocks);
      if (sellC) {
        const amt = surplusToSell(stocks[sellC], desiredStockpile(sellC));
        if (amt > 0 && canSell(stocks[sellC], amt)) marketSell(ctx, owner, sellC, BigInt(amt));
      }
      let cur = ctx.db.nation.owner.find(owner)!;
      stocks = stockpileMapNumber(ctx, owner);
      const buyC = pickDeficitCommodity(stocks);
      if (buyC && Number(cur.money) > BOT_RESERVE_MONEY) {
        const spend = Number(cur.money) - BOT_RESERVE_MONEY;
        const maxAff = spend / Math.max(1, priceOf(buyC));
        const amt = deficitToBuy(stocks[buyC], desiredStockpile(buyC), maxAff);
        if (amt > 0 && canAfford(Number(cur.money), priceOf(buyC), amt)) marketBuy(ctx, owner, buyC, BigInt(amt));
      }

      // c. build the most capable affordable asset in the weakest category
      cur = ctx.db.nation.owner.find(owner)!;
      if (Number(cur.money) > BOT_RESERVE_MONEY * 2) {
        const stat = weakestStat({ education: cur.education, health: cur.health, military: cur.military, technology: cur.technology });
        const candidates = assetsForCategory(stat).slice().sort((a, b) => b.costMoney - a.costMoney);
        const stockMap = stockpileMapNumber(ctx, owner);
        for (const def of candidates) {
          if (canBuildAsset(Number(cur.money), stockMap, def).ok) {
            doBuildAsset(ctx, owner, def.key);
            logEvent(ctx, cur.name, `🏗 ${cur.name} built a ${def.label}.`);
            break;
          }
        }
      }

      // d. occasionally propose a trade (surplus -> need) to another nation
      if (ctx.random() < BOT_PROPOSE_CHANCE) {
        const myOpen = [...ctx.db.tradeOffer.iter()].filter((o) => o.fromOwner.toHexString() === owner.toHexString()).length;
        const sStocks = stockpileMapNumber(ctx, owner);
        const give = pickSurplusCommodity(sStocks);
        const get = pickDeficitCommodity(sStocks);
        if (myOpen < 2 && give && get && give !== get) {
          const others = [...ctx.db.nation.iter()].filter((n) => n.owner.toHexString() !== owner.toHexString());
          if (others.length > 0) {
            const target = others[ctx.random.integerInRange(0, others.length - 1)]!;
            const giveAmt = 10;
            const getAmt = Math.max(1, Math.round((giveAmt * priceOf(give)) / Math.max(1, priceOf(get))));
            if (stockpileAmount(ctx, owner, give) >= BigInt(giveAmt) && !activeWarBetween(ctx, owner.toHexString(), target.owner.toHexString())) {
              doProposeTrade(ctx, owner, target.owner, give, BigInt(giveAmt), get, BigInt(getAmt));
            }
          }
        }
      }

      // e. sue for peace if losing a long war
      for (const wr of [...ctx.db.war.iter()].filter((w) => w.active && (w.attacker.toHexString() === owner.toHexString() || w.defender.toHexString() === owner.toHexString()))) {
        const enemyId = wr.attacker.toHexString() === owner.toHexString() ? wr.defender : wr.attacker;
        const enemy = ctx.db.nation.owner.find(enemyId);
        const me = ctx.db.nation.owner.find(owner);
        if (me && enemy && me.military < enemy.military && year - wr.startYear >= 3) doMakePeace(ctx, owner, wr.id);
      }

      // f. rarely, a dominant bot declares war on a distrusted weaker neighbour
      if (ctx.random() < BOT_WAR_CHANCE && activeWarsCount(ctx) < BOT_MAX_ACTIVE_WARS) {
        const me = ctx.db.nation.owner.find(owner)!;
        const targets = [...ctx.db.nation.iter()].filter((n) =>
          n.owner.toHexString() !== owner.toHexString() &&
          me.military > n.military * 1.3 &&
          trustValue(ctx, owner, n.owner) < 25 &&
          !activeWarBetween(ctx, owner.toHexString(), n.owner.toHexString()));
        if (targets.length > 0) doDeclareWar(ctx, owner, targets[ctx.random.integerInRange(0, targets.length - 1)]!.owner);
      }
    } catch {
      // A single bot's failed action never aborts the year.
    }
  }
}

// ---------- yearly settlement ----------
function settleYear(ctx: Ctx) {
  const w = getWorld(ctx);
  const newYear = w.year + 1;
  const nations = [...ctx.db.nation.iter()];

  // Per-nation: tax, production, consumption, asset tailwinds + upkeep, shortage penalties.
  const shortageByOwner = new Map<string, Set<StatKey>>();
  for (const n of nations) {
    let money = n.money;
    money += toBig(taxHarvest(n.gdp, n.taxRate));

    // production
    for (const p of ctx.db.production.by_owner.filter(n.owner)) addStockpile(ctx, n.owner, p.commodity, p.perYear);

    // consumption + shortage detection
    const shortages = new Set<StatKey>();
    for (const c of COMMODITY_KEYS) {
      const need = toBig(consumptionFor(c));
      const have = stockpileAmount(ctx, n.owner, c);
      if (have < need) {
        const stat = COMMODITIES[c].shortageStat;
        if (stat) shortages.add(stat);
      }
      addStockpile(ctx, n.owner, c, -need);
    }

    // asset tailwinds (stat growth) + upkeep
    const tw = aggregateTailwinds(ownedAssets(ctx, n.owner), newYear);
    let education = clamp01(n.education + tw.statDeltas.education);
    let health = clamp01(n.health + tw.statDeltas.health);
    let military = clamp01(n.military + tw.statDeltas.military);
    let technology = clamp01(n.technology + tw.statDeltas.technology);
    money = money > toBig(tw.upkeep) ? money - toBig(tw.upkeep) : 0n;

    // shortage penalties
    for (const stat of shortages) {
      if (stat === 'education') education = shortagePenalty(education, true);
      else if (stat === 'health') health = shortagePenalty(health, true);
      else if (stat === 'military') military = shortagePenalty(military, true);
      else if (stat === 'technology') technology = shortagePenalty(technology, true);
    }
    shortageByOwner.set(n.owner.toHexString(), shortages);

    ctx.db.nation.owner.update({ ...n, money, education, health, military, technology });
  }

  // War attrition: each active war drains money, materiel (oil/steel) and military
  // from both sides, and lifts oil/steel demand on the market.
  let oilWarDemand = 0;
  let steelWarDemand = 0;
  for (const wr of ctx.db.war.iter()) {
    if (!wr.active) continue;
    oilWarDemand += WAR_MARKET_DEMAND;
    steelWarDemand += WAR_MARKET_DEMAND;
    const duration = newYear - wr.startYear;
    for (const side of [wr.attacker, wr.defender]) {
      const enemy = side.toHexString() === wr.attacker.toHexString() ? wr.defender : wr.attacker;
      const n = ctx.db.nation.owner.find(side);
      const en = ctx.db.nation.owner.find(enemy);
      if (!n || !en) continue;
      const cost = toBig(WAR_MONEY_COST * (1 + duration * 0.2));
      ctx.db.nation.owner.update({
        ...n,
        money: n.money > cost ? n.money - cost : 0n,
        military: Math.max(0, n.military - warAttrition(n.military, en.military)),
        education: Math.max(0, n.education - WAR_STAT_DRAG),
        health: Math.max(0, n.health - WAR_STAT_DRAG),
      });
      addStockpile(ctx, side, 'oil', -toBig(WAR_MATERIEL));
      addStockpile(ctx, side, 'steel', -toBig(WAR_MATERIEL));
    }
  }

  // Bot nations take their turn — their market orders feed this year's price drift.
  runBots(ctx, newYear);

  // Market update per commodity (uses post-production/consumption stockpiles).
  for (const c of COMMODITY_KEYS) {
    const m = ctx.db.commodityMarket.commodity.find(c);
    if (!m) continue;
    const def = COMMODITIES[c];
    // Supply is the annual FLOW (baseline + production), not accumulated inventory,
    // so prices track supply/demand around the base instead of collapsing to the floor.
    let prod = 0;
    for (const row of ctx.db.production.iter()) if (row.commodity === c) prod += Number(row.perYear);
    const warDemand = c === 'oil' ? oilWarDemand : c === 'steel' ? steelWarDemand : 0;
    const globalSupply = def.baseSupply + prod;
    const globalDemand = def.baseDemand + nations.length * consumptionFor(c) + m.recentBuyVolume + warDemand;
    const scarcity = computeScarcity(globalSupply, globalDemand);
    const volatility = computeVolatility(recentPrices(ctx, c));
    const cycle = priceCycle(newYear, COMMODITY_KEYS.indexOf(c));
    const target = computeTargetPrice(
      def.basePrice,
      supplyDemandMultiplier(globalSupply, globalDemand, m.recentBuyVolume, m.recentSellVolume),
      scarcityMultiplier(scarcity),
      m.eventMultiplier,
      volatilityMultiplier(volatility),
      cycle
    );
    const next = clampPrice(smoothPrice(m.currentPrice, target), def.basePrice, eventActive(m.crisisUntilYear, newYear));
    const change = next - m.currentPrice;
    ctx.db.commodityMarket.commodity.update({
      ...m,
      previousPrice: m.currentPrice,
      currentPrice: next,
      priceChange: change,
      priceChangePercent: m.currentPrice > 0 ? (change / m.currentPrice) * 100 : 0,
      globalSupply,
      globalDemand,
      scarcityLevel: scarcity,
      volatility,
      recentBuyVolume: decayVolume(m.recentBuyVolume),
      recentSellVolume: decayVolume(m.recentSellVolume),
      lastUpdatedYear: newYear,
    });
    pushHistory(ctx, c, newYear, next);
  }

  // GDP recompute (post-market) + history point.
  for (const n of nations) {
    const cur = ctx.db.nation.owner.find(n.owner);
    if (!cur) continue;
    const tailwind = aggregateTailwinds(ownedAssets(ctx, n.owner), newYear);
    const gdp = computeGdpValue(
      { education: cur.education, taxRate: cur.taxRate, health: cur.health, military: cur.military, technology: cur.technology },
      resourceValueOf(ctx, n.owner),
      tailwind.gdp,
      warSeverityFor(ctx, n.owner, newYear)
    );
    ctx.db.nation.owner.update({ ...cur, gdp });
    ctx.db.gdpHistory.insert({ id: 0n, owner: n.owner, year: newYear, gdp });
  }

  const status: typeof w.status = newYear >= GAME_END_YEAR ? { tag: 'ended' } : w.status;
  ctx.db.world.id.update({ ...w, year: newYear, status });
  logEvent(ctx, 'System', `📅 Year ${newYear}: taxes collected, production settled, markets updated.`);
  if (newYear >= GAME_END_YEAR && w.status.tag !== 'ended') {
    let winner: { name: string; gdp: number } | null = null;
    for (const n of ctx.db.nation.iter()) if (!winner || n.gdp > winner.gdp) winner = { name: n.name, gdp: n.gdp };
    if (winner) logEvent(ctx, winner.name, `🏆 ${winner.name} wins with GDP $${winner.gdp.toFixed(0)}M.`);
  }
}

export const advanceYear = spacetimedb.reducer((ctx) => {
  requireRunning(ctx);
  requireMyNation(ctx);
  settleYear(ctx);
});

export const triggerMarketShock = spacetimedb.reducer(
  { commodity: t.string(), magnitude: t.f32(), durationYears: t.f32() },
  (ctx, { commodity, magnitude, durationYears }) => {
    requireRunning(ctx);
    if (!isCommodity(commodity)) throw new Error('unknown commodity');
    const m = ctx.db.commodityMarket.commodity.find(commodity);
    if (!m) throw new Error('market not found');
    const w = getWorld(ctx);
    ctx.db.commodityMarket.commodity.update({
      ...m,
      eventMultiplier: Math.max(0.2, magnitude),
      crisisUntilYear: w.year + Math.max(0, durationYears),
    });
    logEvent(ctx, 'System', `⚠ Market shock on ${commodity} (x${magnitude.toFixed(2)} for ${durationYears} yrs).`);
  }
);

// ---------- reset ----------
export const resetGame = spacetimedb.reducer((ctx) => {
  for (const n of [...ctx.db.nation.iter()]) ctx.db.nation.owner.delete(n.owner);
  for (const s of [...ctx.db.stockpile.iter()]) ctx.db.stockpile.id.delete(s.id);
  for (const p of [...ctx.db.production.iter()]) ctx.db.production.id.delete(p.id);
  for (const m of [...ctx.db.commodityMarket.iter()]) ctx.db.commodityMarket.commodity.delete(m.commodity);
  for (const h of [...ctx.db.marketHistory.iter()]) ctx.db.marketHistory.id.delete(h.id);
  for (const a of [...ctx.db.asset.iter()]) ctx.db.asset.id.delete(a.id);
  for (const wr of [...ctx.db.war.iter()]) ctx.db.war.id.delete(wr.id);
  for (const o of [...ctx.db.tradeOffer.iter()]) ctx.db.tradeOffer.id.delete(o.id);
  for (const r of [...ctx.db.trust.iter()]) ctx.db.trust.id.delete(r.id);
  for (const e of [...ctx.db.worldEvent.iter()]) ctx.db.worldEvent.id.delete(e.id);
  for (const g of [...ctx.db.gdpHistory.iter()]) ctx.db.gdpHistory.id.delete(g.id);
  seedWorld(ctx);
  const w = getWorld(ctx);
  ctx.db.world.id.update({ ...w, year: 0, status: { tag: 'lobby' } });
});
