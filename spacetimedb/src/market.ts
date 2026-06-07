// ============================================================
// Caravan economic engine — PURE, DETERMINISTIC math + catalogs.
//
// This file MUST NOT import from 'spacetimedb/server' (or anything with
// side effects). Everything here is a pure function of its inputs so it can be
// unit-tested with vitest (see tests/market.test.ts) and bundled into the
// SpacetimeDB module via index.ts. No Math.random / Date.now — determinism is
// required inside reducers.
//
// Units: money & prices are in "$M" (millions), matching nation.money (u64).
// ============================================================

export type CommodityKey = 'oil' | 'energy' | 'grain' | 'steel' | 'medicine' | 'electronics';
export type StatKey = 'education' | 'health' | 'military' | 'technology';
export type AssetCategory = StatKey;
export type TradeSide = 'buy' | 'sell';

export const COMMODITY_KEYS: CommodityKey[] = ['oil', 'energy', 'grain', 'steel', 'medicine', 'electronics'];

// ---- tuning constants ----
export const MIN_FACTOR = 0.25;        // price floor = base * MIN_FACTOR
export const MAX_FACTOR = 4;           // normal price cap = base * MAX_FACTOR
export const CRISIS_MAX_FACTOR = 8;    // crisis price cap = base * CRISIS_MAX_FACTOR
export const ADJUST_SPEED = 0.35;      // smoothing toward target per year (high enough that the cycle shows)
export const VOLUME_DECAY = 0.7;       // recent buy/sell volume decay per year
export const ELASTICITY = 0.6;         // price sensitivity to demand/supply ratio
export const IMPACT_K = 0.04;          // per-trade immediate price-impact coefficient
export const SUPPLY_DEMAND_MIN = 0.3;
export const SUPPLY_DEMAND_MAX = 3;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ============================================================
// Commodity catalog
// ============================================================
export interface CommodityDef {
  key: CommodityKey;
  label: string;
  basePrice: number;             // $M per unit
  baseSupply: number;            // baseline global supply
  baseDemand: number;            // baseline global demand
  consumptionPerNation: number;  // units each nation consumes per year
  shortageStat: StatKey | null;  // stat hurt by a shortage (null = purely economic)
}

export const COMMODITIES: Record<CommodityKey, CommodityDef> = {
  oil:         { key: 'oil',         label: 'Oil',         basePrice: 5, baseSupply: 4000, baseDemand: 4200, consumptionPerNation: 4, shortageStat: null },
  energy:      { key: 'energy',      label: 'Energy',      basePrice: 4, baseSupply: 4500, baseDemand: 4600, consumptionPerNation: 6, shortageStat: 'technology' },
  grain:       { key: 'grain',       label: 'Grain',       basePrice: 2, baseSupply: 6000, baseDemand: 6000, consumptionPerNation: 10, shortageStat: 'health' },
  steel:       { key: 'steel',       label: 'Steel',       basePrice: 3, baseSupply: 3500, baseDemand: 3600, consumptionPerNation: 4, shortageStat: null },
  medicine:    { key: 'medicine',    label: 'Medicine',    basePrice: 6, baseSupply: 2000, baseDemand: 2100, consumptionPerNation: 2, shortageStat: 'health' },
  electronics: { key: 'electronics', label: 'Electronics', basePrice: 8, baseSupply: 1800, baseDemand: 1900, consumptionPerNation: 1, shortageStat: 'technology' },
};

export function commodityDef(key: CommodityKey): CommodityDef {
  return COMMODITIES[key];
}

// ============================================================
// Asset catalog (built through the action shops)
// ============================================================
export interface AssetCost { commodity: CommodityKey; amount: number; }
export interface AssetDef {
  key: string;
  category: AssetCategory;     // maps to the stat it lifts
  label: string;
  costMoney: number;          // $M
  costs: AssetCost[];         // commodity inputs consumed at build time
  statBoostPerYear: number;   // delta to category stat per year at full ramp (0..1 scale)
  gdpTailwindPerYear: number; // flat $M added to GDP per year at full ramp
  rampYears: number;          // years to reach full contribution
  upkeepPerYear: number;      // $M per year
}

export const ASSETS: AssetDef[] = [
  // Military -> military
  { key: 'tank',         category: 'military',   label: 'Tank Division', costMoney: 40,  costs: [{ commodity: 'steel', amount: 6 }],                                        statBoostPerYear: 0.02,  gdpTailwindPerYear: 30,  rampYears: 3, upkeepPerYear: 1 },
  { key: 'jet',          category: 'military',   label: 'Fighter Wing',  costMoney: 90,  costs: [{ commodity: 'steel', amount: 8 }, { commodity: 'electronics', amount: 4 }], statBoostPerYear: 0.035, gdpTailwindPerYear: 55,  rampYears: 4, upkeepPerYear: 3 },
  { key: 'carrier',      category: 'military',   label: 'Carrier Group', costMoney: 180, costs: [{ commodity: 'steel', amount: 18 }, { commodity: 'oil', amount: 12 }],       statBoostPerYear: 0.06,  gdpTailwindPerYear: 110, rampYears: 6, upkeepPerYear: 6 },
  // Healthcare -> health
  { key: 'soup_kitchen', category: 'health',     label: 'Soup Kitchen',  costMoney: 10,  costs: [{ commodity: 'grain', amount: 4 }],                                         statBoostPerYear: 0.015, gdpTailwindPerYear: 12,  rampYears: 2, upkeepPerYear: 1 },
  { key: 'hospital',     category: 'health',     label: 'Hospital',      costMoney: 60,  costs: [{ commodity: 'medicine', amount: 8 }],                                      statBoostPerYear: 0.04,  gdpTailwindPerYear: 60,  rampYears: 4, upkeepPerYear: 2 },
  // Education -> education
  { key: 'school',       category: 'education',  label: 'School',        costMoney: 20,  costs: [],                                                                          statBoostPerYear: 0.025, gdpTailwindPerYear: 25,  rampYears: 3, upkeepPerYear: 1 },
  { key: 'university',   category: 'education',  label: 'University',     costMoney: 80,  costs: [{ commodity: 'electronics', amount: 5 }],                                   statBoostPerYear: 0.05,  gdpTailwindPerYear: 80,  rampYears: 5, upkeepPerYear: 3 },
  // Technology -> technology
  { key: 'lab',          category: 'technology', label: 'Research Lab',  costMoney: 70,  costs: [{ commodity: 'electronics', amount: 6 }],                                   statBoostPerYear: 0.045, gdpTailwindPerYear: 70,  rampYears: 5, upkeepPerYear: 3 },
  { key: 'data_center',  category: 'technology', label: 'Data Center',   costMoney: 100, costs: [{ commodity: 'electronics', amount: 8 }, { commodity: 'energy', amount: 10 }], statBoostPerYear: 0.06, gdpTailwindPerYear: 100, rampYears: 5, upkeepPerYear: 4 },
];

export const ASSET_BY_KEY: Record<string, AssetDef> = (() => {
  const m: Record<string, AssetDef> = {};
  for (const a of ASSETS) m[a.key] = a;
  return m;
})();

export function assetsForCategory(category: AssetCategory): AssetDef[] {
  return ASSETS.filter((a) => a.category === category);
}

// ============================================================
// Endowments — comparative advantage (production per nation per year)
// ============================================================
export const DEFAULT_PRODUCTION: Record<CommodityKey, number> = {
  oil: 5, energy: 8, grain: 15, steel: 6, medicine: 3, electronics: 2,
};

export const ENDOWMENTS: Record<string, Partial<Record<CommodityKey, number>>> = {
  'USA':            { grain: 120, energy: 60, electronics: 50, steel: 30, medicine: 30, oil: 40 },
  'China':          { steel: 140, electronics: 80, energy: 50, grain: 60, oil: 20, medicine: 25 },
  'Saudi Arabia':   { oil: 200, energy: 60 },
  'Russia':         { oil: 150, energy: 120, steel: 40, grain: 40 },
  'Iran':           { oil: 90, energy: 40 },
  'Germany':        { steel: 70, medicine: 50, electronics: 45 },
  'Japan':          { electronics: 90, steel: 40 },
  'South Korea':    { electronics: 80, steel: 30 },
  'India':          { grain: 100, medicine: 40, electronics: 20 },
  'Brazil':         { grain: 90, oil: 30, steel: 25 },
  'Canada':         { grain: 70, oil: 60, energy: 50 },
  'United Kingdom': { medicine: 45, electronics: 35 },
  'France':         { medicine: 35, electronics: 30, grain: 40 },
  'Italy':          { medicine: 30, electronics: 25, grain: 30 },
  'Spain':          { grain: 50, medicine: 25 },
  'Mexico':         { oil: 40, grain: 40 },
  'Indonesia':      { oil: 35, grain: 50 },
  'Turkey':         { steel: 35, grain: 40 },
  'Australia':      { steel: 60, energy: 40, grain: 50 },
  'Nigeria':        { oil: 70 },
  'South Africa':   { steel: 45, medicine: 15 },
  'Poland':         { steel: 30, grain: 35 },
  'Vietnam':        { electronics: 30, grain: 40 },
  'Pakistan':       { grain: 45, steel: 15 },
  'Bangladesh':     { grain: 40 },
  'Israel':         { electronics: 40, medicine: 20 },
};

export function productionFor(nationName: string): Record<CommodityKey, number> {
  const e = ENDOWMENTS[nationName] ?? {};
  const out: Record<CommodityKey, number> = { ...DEFAULT_PRODUCTION };
  for (const k of COMMODITY_KEYS) {
    const v = e[k];
    if (v != null) out[k] = v;
  }
  return out;
}

// Starting stockpile: ~2 years of production, so trade can begin immediately.
export function startingStockpile(nationName: string): Record<CommodityKey, number> {
  const prod = productionFor(nationName);
  const out: Record<CommodityKey, number> = { ...prod };
  for (const k of COMMODITY_KEYS) out[k] = Math.round(prod[k] * 2 + COMMODITIES[k].consumptionPerNation);
  return out;
}

// ============================================================
// Price model
// ============================================================
export function supplyDemandMultiplier(supply: number, demand: number, buyVol: number, sellVol: number): number {
  const s = Math.max(1, supply + sellVol * 0.5);
  const d = Math.max(1, demand + buyVol * 0.8);
  const m = Math.pow(d / s, ELASTICITY);
  return clamp(m, SUPPLY_DEMAND_MIN, SUPPLY_DEMAND_MAX);
}

export function computeScarcity(globalSupply: number, baseSupply: number): number {
  if (baseSupply <= 0) return 0;
  return clamp(1 - globalSupply / baseSupply, 0, 1);
}

export function scarcityMultiplier(scarcity: number): number {
  return 1 + scarcity * 1.5; // up to +150% when fully scarce
}

export function computeVolatility(history: number[]): number {
  if (history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  if (mean === 0) return 0;
  const variance = history.reduce((a, b) => a + (b - mean) * (b - mean), 0) / history.length;
  return clamp(Math.sqrt(variance) / mean, 0, 1); // coefficient of variation
}

export function volatilityMultiplier(volatility: number): number {
  // Deterministic, supply-driven band; volatility nudges the target slightly.
  return clamp(1 + (volatility - 0.1) * 0.2, 0.95, 1.1);
}

export function eventActive(crisisUntilYear: number, year: number): boolean {
  return crisisUntilYear > year;
}

// Deterministic natural-looking oscillation: two out-of-phase sinusoids per
// commodity (distinct phase by index) so commodities don't move in lockstep.
// Stays within [1 - CYCLE_BAND, 1 + CYCLE_BAND]. No RNG — fully reproducible.
export const CYCLE_AMP_1 = 0.2;
export const CYCLE_AMP_2 = 0.09;
export const CYCLE_BAND = CYCLE_AMP_1 + CYCLE_AMP_2;
export const CYCLE_FREQ = 0.8;

export function priceCycle(year: number, phaseIndex: number): number {
  const phase = phaseIndex * 1.1;
  return 1
    + CYCLE_AMP_1 * Math.sin(year * CYCLE_FREQ + phase)
    + CYCLE_AMP_2 * Math.cos(year * CYCLE_FREQ * 1.7 + phase * 0.6);
}

export function computeTargetPrice(base: number, sdMult: number, scarcityMult: number, eventMult: number, volMult: number, cycleMult = 1): number {
  return base * sdMult * scarcityMult * eventMult * volMult * cycleMult;
}

export function smoothPrice(current: number, target: number, speed = ADJUST_SPEED): number {
  return current + (target - current) * speed;
}

export function clampPrice(price: number, base: number, crisis: boolean): number {
  const max = base * (crisis ? CRISIS_MAX_FACTOR : MAX_FACTOR);
  const min = base * MIN_FACTOR;
  return clamp(Math.max(0, price), min, max);
}

// Immediate per-trade nudge so the ticker reacts in real time to orders.
export function priceImpact(price: number, amount: number, depth: number, side: TradeSide): number {
  const frac = clamp((amount / Math.max(1, depth)) * IMPACT_K, 0, 0.25);
  return side === 'buy' ? price * frac : -price * frac;
}

export function decayVolume(v: number): number {
  return v * VOLUME_DECAY;
}

// ============================================================
// Buy / sell + asset guards
// ============================================================
export function costOf(price: number, amount: number): number {
  return Math.max(0, price * amount);
}

export function canAfford(money: number, price: number, amount: number): boolean {
  return amount > 0 && money >= costOf(price, amount);
}

export function canSell(stockpile: number, amount: number): boolean {
  return amount > 0 && stockpile >= amount;
}

export interface BuildCheck { ok: boolean; missing?: 'money' | CommodityKey; }
export function canBuildAsset(money: number, stockpiles: Partial<Record<CommodityKey, number>>, asset: AssetDef): BuildCheck {
  if (money < asset.costMoney) return { ok: false, missing: 'money' };
  for (const c of asset.costs) {
    if ((stockpiles[c.commodity] ?? 0) < c.amount) return { ok: false, missing: c.commodity };
  }
  return { ok: true };
}

// ============================================================
// Tailwinds (long-standing asset effects, ramped over time)
// ============================================================
export function rampFactor(ageYears: number, rampYears: number): number {
  if (rampYears <= 0) return 1;
  return clamp(ageYears / rampYears, 0, 1);
}

export interface OwnedAsset { typeKey: string; builtYear: number; }
export interface YearContribution { gdp: number; stat: number; statKey: StatKey; upkeep: number; }

export function assetYearContribution(asset: AssetDef, ageYears: number): YearContribution {
  const f = rampFactor(ageYears, asset.rampYears);
  return { gdp: asset.gdpTailwindPerYear * f, stat: asset.statBoostPerYear * f, statKey: asset.category, upkeep: asset.upkeepPerYear };
}

export interface TailwindTotals { gdp: number; statDeltas: Record<StatKey, number>; upkeep: number; }
export function aggregateTailwinds(assets: OwnedAsset[], year: number): TailwindTotals {
  const statDeltas: Record<StatKey, number> = { education: 0, health: 0, military: 0, technology: 0 };
  let gdp = 0;
  let upkeep = 0;
  for (const a of assets) {
    const def = ASSET_BY_KEY[a.typeKey];
    if (!def) continue;
    const c = assetYearContribution(def, Math.max(0, year - a.builtYear));
    gdp += c.gdp;
    upkeep += c.upkeep;
    statDeltas[c.statKey] += c.stat;
  }
  return { gdp, statDeltas, upkeep };
}

// ============================================================
// Annual economy helpers
// ============================================================
export const TAX_YIELD = 0.5;
export function taxHarvest(gdp: number, taxRate: number): number {
  return Math.max(0, gdp * clamp(taxRate, 0, 1) * TAX_YIELD);
}

export function consumptionFor(commodity: CommodityKey): number {
  return COMMODITIES[commodity].consumptionPerNation;
}

export const SHORTAGE_PENALTY_PER_YEAR = 0.03;
export function shortagePenalty(statValue: number, inShortage: boolean, perYear = SHORTAGE_PENALTY_PER_YEAR): number {
  if (!inShortage) return statValue;
  return clamp(statValue - perYear, 0, 1);
}

// ============================================================
// War — declaring/continuing war drags GDP, compounding each year, and hits the
// militarily weaker side harder. Severity is a multiplicative GDP penalty so it
// scales with nation size. War also consumes money + oil/steel and causes
// military attrition (applied in settlement), and lifts oil/steel demand.
// ============================================================
export const WAR_SEVERITY = 0.06;          // base GDP penalty per active war (year 0)
export const WAR_GROWTH = 0.25;            // +25% penalty for each year the war continues
export const WAR_MILITARY_FACTOR = 1.5;    // weaker military => bigger penalty
export const WAR_SEVERITY_CAP = 0.5;       // max penalty from a single war
export const WAR_GDP_FLOOR = 0.1;          // GDP can fall to at most 10% under total war
export const WAR_MONEY_COST = 30;          // $M/yr base war spending per side
export const WAR_MATERIEL = 4;             // oil & steel consumed per side per war-year
export const WAR_MILITARY_ATTRITION = 0.03;// military lost per war-year (weaker side loses more)
export const WAR_STAT_DRAG = 0.01;         // education/health lost per war-year
export const WAR_MARKET_DEMAND = 600;      // extra oil/steel demand per active war
export const WAR_DECLARE_COST = 60;        // $M one-time mobilization on declaring
export const WAR_TRUST_HIT = 40;           // trust drop on declaring war

// Per-war GDP severity given how long it's lasted and the military gap.
export function warSeverity(durationYears: number, myMilitary: number, enemyMilitary: number): number {
  const disadvantage = Math.max(0, enemyMilitary - myMilitary);
  const s = WAR_SEVERITY * (1 + Math.max(0, durationYears) * WAR_GROWTH) * (1 + disadvantage * WAR_MILITARY_FACTOR);
  return Math.min(WAR_SEVERITY_CAP, s);
}

// Yearly military attrition for one side (the weaker side bleeds faster).
export function warAttrition(myMilitary: number, enemyMilitary: number): number {
  const losing = myMilitary < enemyMilitary;
  return WAR_MILITARY_ATTRITION * (losing ? 1.6 : 0.7);
}

// ============================================================
// GDP — score reflects stats, live market value of holdings, asset tailwinds,
// and a multiplicative war penalty.
// ============================================================
export interface GdpStats { education: number; taxRate: number; health: number; military: number; technology: number; }
export const RESOURCE_VALUE_WEIGHT = 0.2;

export function computeGdpValue(n: GdpStats, resourceValue: number, tailwindGdp: number, warSeverityTotal = 0): number {
  const base = 1000;
  const humanCapital = 1 + n.education;
  const healthFactor = 1 + n.health * 0.5;
  const techFactor = 1 + n.technology * 0.5;
  const militaryFactor = 1 + n.military * 0.15;
  const taxDrag = 1 - n.taxRate * 0.5;
  const core = base * humanCapital * healthFactor * techFactor * militaryFactor * taxDrag
    + Math.max(0, resourceValue) * RESOURCE_VALUE_WEIGHT
    + Math.max(0, tailwindGdp);
  return Math.max(0, core * clamp(1 - warSeverityTotal, WAR_GDP_FLOOR, 1));
}

// ============================================================
// Bot decisions — PURE heuristics the in-module AI uses each year. No ctx, no
// RNG here (the engine layers ctx.random on top); fully unit-testable.
// ============================================================
export const BOT_BUFFER_YEARS = 8;       // target stockpile ≈ this many years of consumption
export const BOT_STOCK_FLOOR = 20;       // plus a small base buffer
export const BOT_RESERVE_MONEY = 300;    // cash a bot keeps before building/buying
export const BOT_SELL_FRACTION = 0.3;    // sell this share of the surplus above target
export const BOT_BUY_FRACTION = 0.5;     // buy this share of the gap toward target
export const BOT_MAX_ORDER = 60;         // cap a single bot market order

// How much of a commodity a bot wants on hand.
export function desiredStockpile(commodity: CommodityKey): number {
  return COMMODITIES[commodity].consumptionPerNation * BOT_BUFFER_YEARS + BOT_STOCK_FLOOR;
}

// Units to sell when holding a surplus (0 if not clearly over target).
export function surplusToSell(stock: number, target: number): number {
  if (stock <= target * 1.5) return 0;
  return Math.min(BOT_MAX_ORDER, Math.floor((stock - target) * BOT_SELL_FRACTION));
}

// Units to buy when short (bounded by what the bot can afford), 0 if not clearly short.
export function deficitToBuy(stock: number, target: number, maxAffordable: number): number {
  if (stock >= target * 0.6) return 0;
  const want = Math.floor((target - stock) * BOT_BUY_FRACTION);
  return Math.max(0, Math.min(BOT_MAX_ORDER, want, Math.floor(maxAffordable)));
}

// The lowest of the four development stats — where a bot should invest next.
export function weakestStat(stats: { education: number; health: number; military: number; technology: number }): StatKey {
  const entries: [StatKey, number][] = [
    ['education', stats.education], ['health', stats.health],
    ['military', stats.military], ['technology', stats.technology],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

// A trade is favourable to the receiver if market value received ≥ ~value given.
export function tradeIsFavourable(
  giveC: CommodityKey, giveAmt: number, getC: CommodityKey, getAmt: number,
  price: (c: CommodityKey) => number, tolerance = 0.95,
): boolean {
  const valueIn = getAmt * price(getC);
  const valueOut = giveAmt * price(giveC);
  return valueIn >= valueOut * tolerance;
}

// Pick the commodity a bot has the largest relative surplus of (to sell/offer).
export function pickSurplusCommodity(stock: Record<CommodityKey, number>): CommodityKey | null {
  let best: CommodityKey | null = null;
  let bestRatio = 1.5; // must be clearly above target
  for (const c of COMMODITY_KEYS) {
    const ratio = stock[c] / Math.max(1, desiredStockpile(c));
    if (ratio > bestRatio) { bestRatio = ratio; best = c; }
  }
  return best;
}

// Pick the commodity a bot is most short of (to buy/request).
export function pickDeficitCommodity(stock: Record<CommodityKey, number>): CommodityKey | null {
  let best: CommodityKey | null = null;
  let worstRatio = 0.6; // must be clearly below target
  for (const c of COMMODITY_KEYS) {
    const ratio = stock[c] / Math.max(1, desiredStockpile(c));
    if (ratio < worstRatio) { worstRatio = ratio; best = c; }
  }
  return best;
}
