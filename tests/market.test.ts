import { describe, it, expect } from 'vitest';
import {
  ASSET_BY_KEY,
  COMMODITIES,
  aggregateTailwinds,
  assetYearContribution,
  canAfford,
  canBuildAsset,
  canSell,
  clampPrice,
  computeGdpValue,
  computeScarcity,
  computeTargetPrice,
  consumptionFor,
  costOf,
  decayVolume,
  priceImpact,
  productionFor,
  rampFactor,
  shortagePenalty,
  smoothPrice,
  supplyDemandMultiplier,
  taxHarvest,
  CRISIS_MAX_FACTOR,
  MAX_FACTOR,
  MIN_FACTOR,
  VOLUME_DECAY,
} from '../spacetimedb/src/market';

describe('price movement', () => {
  it('smoothPrice moves toward the target and never overshoots', () => {
    let p = 100;
    const target = 200;
    let prev = p;
    for (let i = 0; i < 50; i++) {
      p = smoothPrice(p, target);
      expect(p).toBeGreaterThan(prev - 1e-9); // monotone up toward target
      expect(p).toBeLessThanOrEqual(target + 1e-9); // never overshoots above target
      prev = p;
    }
    expect(p).toBeCloseTo(target, 0); // converges
  });

  it('a single smoothing step advances by exactly (target-current)*speed', () => {
    expect(smoothPrice(100, 200, 0.15)).toBeCloseTo(115, 6);
  });

  it('higher demand yields a higher target price than higher supply', () => {
    const base = COMMODITIES.oil.basePrice;
    const highDemand = computeTargetPrice(base, supplyDemandMultiplier(1000, 4000, 0, 0), 1, 1, 1);
    const highSupply = computeTargetPrice(base, supplyDemandMultiplier(4000, 1000, 0, 0), 1, 1, 1);
    expect(highDemand).toBeGreaterThan(highSupply);
  });
});

describe('caps and floors', () => {
  const base = 100;
  it('enforces the 0.25x floor', () => {
    expect(clampPrice(1, base, false)).toBe(base * MIN_FACTOR);
  });
  it('enforces the 4x normal cap', () => {
    expect(clampPrice(99999, base, false)).toBe(base * MAX_FACTOR);
  });
  it('enforces the 8x crisis cap', () => {
    expect(clampPrice(99999, base, true)).toBe(base * CRISIS_MAX_FACTOR);
  });
  it('never returns a negative price', () => {
    expect(clampPrice(-500, base, false)).toBeGreaterThanOrEqual(0);
    expect(clampPrice(-500, base, false)).toBe(base * MIN_FACTOR);
  });
});

describe('price impact (immediate)', () => {
  it('buying pushes price up, selling pushes it down', () => {
    expect(priceImpact(100, 50, 1000, 'buy')).toBeGreaterThan(0);
    expect(priceImpact(100, 50, 1000, 'sell')).toBeLessThan(0);
  });
  it('larger orders move price more, capped at 25%', () => {
    const small = priceImpact(100, 10, 1000, 'buy');
    const big = priceImpact(100, 500, 1000, 'buy');
    expect(big).toBeGreaterThan(small);
    expect(priceImpact(100, 10_000_000, 1, 'buy')).toBeLessThanOrEqual(25 + 1e-9);
  });
});

describe('buy/sell guards', () => {
  it('costOf multiplies price by amount, never negative', () => {
    expect(costOf(60, 10)).toBe(600);
    expect(costOf(60, 0)).toBe(0);
  });
  it('canAfford rejects when money is short and zero/neg amounts', () => {
    expect(canAfford(1000, 60, 10)).toBe(true);
    expect(canAfford(500, 60, 10)).toBe(false);
    expect(canAfford(1000, 60, 0)).toBe(false);
  });
  it('canSell rejects overselling and zero amounts', () => {
    expect(canSell(100, 40)).toBe(true);
    expect(canSell(100, 200)).toBe(false);
    expect(canSell(100, 0)).toBe(false);
  });
  it('decayVolume shrinks toward zero', () => {
    expect(decayVolume(100)).toBeCloseTo(100 * VOLUME_DECAY, 6);
  });
});

describe('assets and tailwinds', () => {
  it('canBuildAsset checks money then each commodity, naming what is missing', () => {
    const hospital = ASSET_BY_KEY['hospital'];
    expect(canBuildAsset(1000, { medicine: 50 }, hospital)).toEqual({ ok: true });
    expect(canBuildAsset(10, { medicine: 50 }, hospital)).toEqual({ ok: false, missing: 'money' });
    expect(canBuildAsset(1000, { medicine: 1 }, hospital)).toEqual({ ok: false, missing: 'medicine' });
  });

  it('assetYearContribution ramps 0 -> full then plateaus', () => {
    const lab = ASSET_BY_KEY['lab']; // rampYears 5
    expect(rampFactor(0, 5)).toBe(0);
    expect(assetYearContribution(lab, 0).gdp).toBe(0);
    expect(assetYearContribution(lab, 5).gdp).toBeCloseTo(lab.gdpTailwindPerYear, 6);
    expect(assetYearContribution(lab, 50).gdp).toBeCloseTo(lab.gdpTailwindPerYear, 6); // plateau
    expect(assetYearContribution(lab, 2).gdp).toBeCloseTo(lab.gdpTailwindPerYear * (2 / 5), 6);
  });

  it('aggregateTailwinds sums gdp, stat deltas, and upkeep by category', () => {
    const totals = aggregateTailwinds(
      [
        { typeKey: 'hospital', builtYear: 0 },     // health
        { typeKey: 'soup_kitchen', builtYear: 0 }, // health
        { typeKey: 'tank', builtYear: 0 },         // military
      ],
      10, // well past all ramps
    );
    expect(totals.statDeltas.health).toBeCloseTo(
      ASSET_BY_KEY['hospital'].statBoostPerYear + ASSET_BY_KEY['soup_kitchen'].statBoostPerYear,
      6,
    );
    expect(totals.statDeltas.military).toBeCloseTo(ASSET_BY_KEY['tank'].statBoostPerYear, 6);
    expect(totals.upkeep).toBe(
      ASSET_BY_KEY['hospital'].upkeepPerYear + ASSET_BY_KEY['soup_kitchen'].upkeepPerYear + ASSET_BY_KEY['tank'].upkeepPerYear,
    );
    expect(totals.gdp).toBeGreaterThan(0);
  });
});

describe('annual economy', () => {
  it('taxHarvest scales with gdp and rate, never negative', () => {
    expect(taxHarvest(10_000, 0.2)).toBeGreaterThan(0);
    expect(taxHarvest(10_000, 0.4)).toBeGreaterThan(taxHarvest(10_000, 0.2));
    expect(taxHarvest(10_000, 0)).toBe(0);
  });

  it('shortagePenalty reduces a stat only while in shortage and clamps at 0', () => {
    expect(shortagePenalty(0.5, true)).toBeLessThan(0.5);
    expect(shortagePenalty(0.5, false)).toBe(0.5);
    expect(shortagePenalty(0.0, true)).toBe(0);
  });

  it('consumptionFor returns the per-nation consumption from the catalog', () => {
    expect(consumptionFor('grain')).toBe(COMMODITIES.grain.consumptionPerNation);
  });
});

describe('supply / scarcity / comparative advantage', () => {
  it('continuous selling raises supply which lowers the supply/demand multiplier', () => {
    const noSell = supplyDemandMultiplier(4000, 4200, 0, 0);
    const heavySell = supplyDemandMultiplier(4000, 4200, 0, 5000);
    expect(heavySell).toBeLessThan(noSell);
  });

  it('computeScarcity rises as supply falls below baseline', () => {
    expect(computeScarcity(4000, 4000)).toBeCloseTo(0, 6);
    expect(computeScarcity(2000, 4000)).toBeCloseTo(0.5, 6);
    expect(computeScarcity(0, 4000)).toBe(1);
  });

  it('endowments give resource-rich nations far more production (comparative advantage)', () => {
    expect(productionFor('Saudi Arabia').oil).toBeGreaterThan(productionFor('Japan').oil);
    expect(productionFor('Japan').electronics).toBeGreaterThan(productionFor('Saudi Arabia').electronics);
  });
});

describe('gdp', () => {
  it('computeGdpValue grows with holdings value and asset tailwinds', () => {
    const stats = { education: 0.5, taxRate: 0.2, health: 0.5, military: 0.3, technology: 0.4 };
    const baseline = computeGdpValue(stats, 0, 0);
    expect(computeGdpValue(stats, 10_000, 0)).toBeGreaterThan(baseline);
    expect(computeGdpValue(stats, 0, 500)).toBeGreaterThan(baseline);
  });
});
