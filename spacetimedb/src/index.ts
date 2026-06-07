import {
  schema,
  table,
  t,
  SenderError,
  type InferSchema,
  type ReducerCtx,
} from 'spacetimedb/server';
import { Identity } from 'spacetimedb';

const WorldStatus = t.enum('WorldStatus', {
  lobby: t.unit(),
  running: t.unit(),
  ended: t.unit(),
});

const Resource = t.enum('Resource', {
  goods: t.unit(),
  energy: t.unit(),
});

const world = table(
  { name: 'world', public: true },
  {
    id: t.u8().primaryKey(),
    year: t.f32(),
    status: WorldStatus,
  }
);

const nation = table(
  { name: 'nation', public: true },
  {
    owner: t.identity().primaryKey(),
    name: t.string(),
    money: t.u64(),
    goods: t.u64(),
    energy: t.u64(),
    education: t.f32(),
    taxRate: t.f32(),
  }
);

const tradeOffer = table(
  { name: 'trade_offer', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    fromOwner: t.identity().index('btree'),
    toOwner: t.identity().index('btree'),
    giveResource: Resource,
    giveAmount: t.u64(),
    getResource: Resource,
    getAmount: t.u64(),
    createdAt: t.timestamp(),
  }
);

const trust = table(
  {
    name: 'trust',
    public: true,
    indexes: [
      { accessor: 'by_pair', algorithm: 'btree', columns: ['fromOwner', 'toOwner'] },
    ],
  },
  {
    id: t.u64().primaryKey().autoInc(),
    fromOwner: t.identity(),
    toOwner: t.identity(),
    value: t.u8(),
  }
);

const spacetimedb = schema({ world, nation, tradeOffer, trust });
export default spacetimedb;

const STARTING_MONEY = 1000n;
const STARTING_GOODS = 100n;
const STARTING_ENERGY = 100n;
const STARTING_EDUCATION = 0.1;
const STARTING_TAX = 0.1;
const TIME_STEP = 0.25;
const GAME_END_YEAR = 100;
const BASE_PRODUCTION = 50;

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

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
  if (w.status.tag !== 'running') {
    throw new Error(`world is ${w.status.tag}, not running`);
  }
  return w;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

type ResourceVal = { tag: 'goods' } | { tag: 'energy' };

function getResourceAmount(n: { goods: bigint; energy: bigint }, res: ResourceVal): bigint {
  return res.tag === 'goods' ? n.goods : n.energy;
}

function withResource<T extends { goods: bigint; energy: bigint }>(
  n: T,
  res: ResourceVal,
  amount: bigint
): T {
  return res.tag === 'goods' ? { ...n, goods: amount } : { ...n, energy: amount };
}

const TRUST_START = 50;
const TRUST_MIN = 0;
const TRUST_MAX = 100;

function clampTrust(v: number): number {
  return Math.max(TRUST_MIN, Math.min(TRUST_MAX, v));
}

function bumpTrust(ctx: Ctx, from: { toHexString(): string } & any, to: { toHexString(): string } & any, delta: number) {
  const existing = [...ctx.db.trust.by_pair.filter([from, to])][0];
  if (existing) {
    ctx.db.trust.id.update({
      ...existing,
      value: clampTrust(existing.value + delta),
    });
  } else {
    ctx.db.trust.insert({
      id: 0n,
      fromOwner: from,
      toOwner: to,
      value: clampTrust(TRUST_START + delta),
    });
  }
}

function tickAll(ctx: Ctx) {
  for (const n of [...ctx.db.nation.iter()]) {
    const growth = BASE_PRODUCTION * (1 + n.education) * (1 - n.taxRate);
    const resourceBonus = (n.goods + n.energy) / 10n;
    const newMoney = n.money + BigInt(Math.floor(growth)) + resourceBonus;
    ctx.db.nation.owner.update({ ...n, money: newMoney });
  }
}

function advanceTime(ctx: Ctx) {
  const w = getWorld(ctx);
  const after = w.year + TIME_STEP;
  if (Math.floor(after) > Math.floor(w.year)) tickAll(ctx);
  const status: typeof w.status =
    after >= GAME_END_YEAR ? { tag: 'ended' } : w.status;
  ctx.db.world.id.update({ ...w, year: after, status });
}

/* ---------- demo seeds ---------- */

interface SeedNation {
  hex: string;
  name: string;
  money: bigint;
  goods: bigint;
  energy: bigint;
  education: number;
  taxRate: number;
}

const SEED_NATIONS: SeedNation[] = [
  { hex: 'bb01000000000000000000000000000000000000000000000000000000000001',
    name: 'Empire',    money: 5000n, goods: 500n, energy: 500n, education: 0.80, taxRate: 0.30 },
  { hex: 'bb02000000000000000000000000000000000000000000000000000000000002',
    name: 'Pacifica',  money: 2000n, goods: 300n, energy: 200n, education: 0.55, taxRate: 0.20 },
  { hex: 'bb03000000000000000000000000000000000000000000000000000000000003',
    name: 'Atlantis',  money:  800n, goods: 200n, energy: 800n, education: 0.30, taxRate: 0.15 },
  { hex: 'bb04000000000000000000000000000000000000000000000000000000000004',
    name: 'Northland', money: 1500n, goods: 100n, energy: 100n, education: 0.65, taxRate: 0.40 },
  { hex: 'bb05000000000000000000000000000000000000000000000000000000000005',
    name: 'Sahara',    money:  600n, goods: 400n, energy: 300n, education: 0.20, taxRate: 0.10 },
];

export const init = spacetimedb.init((ctx) => {
  ctx.db.world.insert({
    id: 0,
    year: 0,
    status: { tag: 'lobby' },
  });
  for (const s of SEED_NATIONS) {
    ctx.db.nation.insert({
      owner: Identity.fromString(s.hex),
      name: s.name,
      money: s.money,
      goods: s.goods,
      energy: s.energy,
      education: s.education,
      taxRate: s.taxRate,
    });
  }
});

export const onConnect = spacetimedb.clientConnected((_ctx) => {});
export const onDisconnect = spacetimedb.clientDisconnected((_ctx) => {});

export const claimNation = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const w = getWorld(ctx);
    if (w.status.tag !== 'lobby') throw new Error('lobby is closed');
    if (ctx.db.nation.owner.find(ctx.sender)) {
      throw new Error('already claimed a nation');
    }
    ctx.db.nation.insert({
      owner: ctx.sender,
      name,
      money: STARTING_MONEY,
      goods: STARTING_GOODS,
      energy: STARTING_ENERGY,
      education: STARTING_EDUCATION,
      taxRate: STARTING_TAX,
    });
  }
);

export const startRun = spacetimedb.reducer((ctx) => {
  const w = getWorld(ctx);
  if (w.status.tag !== 'lobby') throw new Error('already started');
  requireMyNation(ctx);
  ctx.db.world.id.update({ ...w, status: { tag: 'running' } });
});

export const investEducation = spacetimedb.reducer(
  { amount: t.u64() },
  (ctx, { amount }) => {
    requireRunning(ctx);
    const n = requireMyNation(ctx);
    if (amount === 0n) throw new Error('amount must be > 0');
    if (n.money < amount) throw new Error('insufficient money');
    const educationGain = Number(amount) * 0.0001;
    ctx.db.nation.owner.update({
      ...n,
      money: n.money - amount,
      education: clamp01(n.education + educationGain),
    });
    advanceTime(ctx);
  }
);

export const setTax = spacetimedb.reducer(
  { rate: t.f32() },
  (ctx, { rate }) => {
    requireRunning(ctx);
    const n = requireMyNation(ctx);
    ctx.db.nation.owner.update({ ...n, taxRate: clamp01(rate) });
    advanceTime(ctx);
  }
);

export const proposeTrade = spacetimedb.reducer(
  {
    to: t.identity(),
    giveResource: Resource,
    giveAmount: t.u64(),
    getResource: Resource,
    getAmount: t.u64(),
  },
  (ctx, { to, giveResource, giveAmount, getResource, getAmount }) => {
    requireRunning(ctx);
    const me = requireMyNation(ctx);
    if (to.toHexString() === ctx.sender.toHexString()) {
      throw new Error('cannot trade with yourself');
    }
    const counterparty = ctx.db.nation.owner.find(to);
    if (!counterparty) throw new Error('target nation does not exist');
    if (giveAmount === 0n || getAmount === 0n) {
      throw new Error('amounts must be > 0');
    }
    if (getResourceAmount(me, giveResource) < giveAmount) {
      throw new Error(`insufficient ${giveResource.tag} to offer`);
    }
    ctx.db.tradeOffer.insert({
      id: 0n,
      fromOwner: ctx.sender,
      toOwner: to,
      giveResource,
      giveAmount,
      getResource,
      getAmount,
      createdAt: ctx.timestamp,
    });
    advanceTime(ctx);
  }
);

export const respondTrade = spacetimedb.reducer(
  { offerId: t.u64(), approve: t.bool() },
  (ctx, { offerId, approve }) => {
    requireRunning(ctx);
    const offer = ctx.db.tradeOffer.id.find(offerId);
    if (!offer) throw new Error('offer not found');
    if (offer.toOwner.toHexString() !== ctx.sender.toHexString()) {
      throw new SenderError('only the recipient can respond');
    }

    if (!approve) {
      // Proposer (offer.fromOwner) loses trust in the rejecter (offer.toOwner).
      bumpTrust(ctx, offer.fromOwner, offer.toOwner, -5);
      ctx.db.tradeOffer.id.delete(offerId);
      advanceTime(ctx);
      return;
    }

    // Approve path: re-check feasibility on both sides at response time.
    const proposer = ctx.db.nation.owner.find(offer.fromOwner);
    const responder = ctx.db.nation.owner.find(offer.toOwner);
    if (!proposer || !responder) throw new Error('a party no longer exists');

    if (getResourceAmount(proposer, offer.giveResource) < offer.giveAmount) {
      throw new Error('proposer can no longer cover the offer');
    }
    if (getResourceAmount(responder, offer.getResource) < offer.getAmount) {
      throw new Error('you do not have enough to fulfil the offer');
    }

    // Atomic swap: proposer loses giveAmount of giveResource, gains getAmount of getResource.
    // Responder is the mirror.
    let p = proposer;
    let r = responder;
    p = withResource(p, offer.giveResource, getResourceAmount(p, offer.giveResource) - offer.giveAmount);
    r = withResource(r, offer.giveResource, getResourceAmount(r, offer.giveResource) + offer.giveAmount);
    r = withResource(r, offer.getResource, getResourceAmount(r, offer.getResource) - offer.getAmount);
    p = withResource(p, offer.getResource, getResourceAmount(p, offer.getResource) + offer.getAmount);

    ctx.db.nation.owner.update(p);
    ctx.db.nation.owner.update(r);
    // Both parties gain trust on a successful trade.
    bumpTrust(ctx, offer.fromOwner, offer.toOwner, 5);
    bumpTrust(ctx, offer.toOwner, offer.fromOwner, 5);
    ctx.db.tradeOffer.id.delete(offerId);
    advanceTime(ctx);
  }
);
