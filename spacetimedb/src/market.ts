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
export const ADJUST_SPEED = 0.15;      // smoothing toward target per year
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
  oil:         { key: 'oil',         label: 'Oil',         basePrice: 60,  baseSupply: 4000, baseDemand: 4200, consumptionPerNation: 30, shortageStat: null },
  energy:      { key: 'energy',      label: 'Energy',      basePrice: 50,  baseSupply: 4500, baseDemand: 4600, consumptionPerNation: 40, shortageStat: 'technology' },
  grain:       { key: 'grain',       label: 'Grain',       basePrice: 20,  baseSupply: 6000, baseDemand: 6000, consumptionPerNation: 60, shortageStat: 'health' },
  steel:       { key: 'steel',       label: 'Steel',       basePrice: 40,  baseSupply: 3500, baseDemand: 3600, consumptionPerNation: 20, shortageStat: null },
  medicine:    { key: 'medicine',    label: 'Medicine',    basePrice: 80,  baseSupply: 2000, baseDemand: 2100, consumptionPerNation: 15, shortageStat: 'health' },
  electronics: { key: 'electronics', label: 'Electronics', basePrice: 100, baseSupply: 1800, baseDemand: 1900, consumptionPerNation: 12, shortageStat: 'technology' },
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
  { key: 'tank',         category: 'military',   label: 'Tank Division', costMoney: 200, costs: [{ commodity: 'steel', amount: 10 }],                                       statBoostPerYear: 0.02,  gdpTailwindPerYear: 30,  rampYears: 3, upkeepPerYear: 5 },
  { key: 'jet',          category: 'military',   label: 'Fighter Wing',  costMoney: 450, costs: [{ commodity: 'steel', amount: 12 }, { commodity: 'electronics', amount: 6 }], statBoostPerYear: 0.035, gdpTailwindPerYear: 55,  rampYears: 4, upkeepPerYear: 12 },
  { key: 'carrier',      category: 'military',   label: 'Carrier Group', costMoney: 900, costs: [{ commodity: 'steel', amount: 30 }, { commodity: 'oil', amount: 20 }],        statBoostPerYear: 0.06,  gdpTailwindPerYear: 110, rampYears: 6, upkeepPerYear: 25 },
  // Healthcare -> health
  { key: 'soup_kitchen', category: 'health',     label: 'Soup Kitchen',  costMoney: 50,  costs: [{ commodity: 'grain', amount: 8 }],                                          statBoostPerYear: 0.015, gdpTailwindPerYear: 12,  rampYears: 2, upkeepPerYear: 2 },
  { key: 'hospital',     category: 'health',     label: 'Hospital',      costMoney: 300, costs: [{ commodity: 'medicine', amount: 15 }],                                      statBoostPerYear: 0.04,  gdpTailwindPerYear: 60,  rampYears: 4, upkeepPerYear: 10 },
  // Education -> education
  { key: 'school',       category: 'education',  label: 'School',        costMoney: 100, costs: [],                                                                           statBoostPerYear: 0.025, gdpTailwindPerYear: 25,  rampYears: 3, upkeepPerYear: 4 },
  { key: 'university',   category: 'education',  label: 'University',     costMoney: 400, costs: [{ commodity: 'electronics', amount: 8 }],                                    statBoostPerYear: 0.05,  gdpTailwindPerYear: 80,  rampYears: 5, upkeepPerYear: 14 },
  // Technology -> technology
  { key: 'lab',          category: 'technology', label: 'Research Lab',  costMoney: 350, costs: [{ commodity: 'electronics', amount: 10 }],                                   statBoostPerYear: 0.045, gdpTailwindPerYear: 70,  rampYears: 5, upkeepPerYear: 12 },
  { key: 'data_center',  category: 'technology', label: 'Data Center',   costMoney: 500, costs: [{ commodity: 'electronics', amount: 12 }, { commodity: 'energy', amount: 15 }], statBoostPerYear: 0.06, gdpTailwindPerYear: 100, rampYears: 5, upkeepPerYear: 18 },
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

export function computeTargetPrice(base: number, sdMult: number, scarcityMult: number, eventMult: number, volMult: number): number {
  return base * sdMult * scarcityMult * eventMult * volMult;
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
export const TAX_YIELD = 0.15;
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
// GDP — score reflects stats, live market value of holdings, and asset tailwinds.
// ============================================================
export interface GdpStats { education: number; taxRate: number; health: number; military: number; technology: number; }
export const RESOURCE_VALUE_WEIGHT = 0.2;

export function computeGdpValue(n: GdpStats, resourceValue: number, tailwindGdp: number): number {
  const base = 1000;
  const humanCapital = 1 + n.education;
  const healthFactor = 1 + n.health * 0.5;
  const techFactor = 1 + n.technology * 0.5;
  const militaryFactor = 1 + n.military * 0.15;
  const taxDrag = 1 - n.taxRate * 0.5;
  return base * humanCapital * healthFactor * techFactor * militaryFactor * taxDrag
    + Math.max(0, resourceValue) * RESOURCE_VALUE_WEIGHT
    + Math.max(0, tailwindGdp);
}
