import {
  schema,
  table,
  t,
  SenderError,
  type InferSchema,
  type ReducerCtx,
} from 'spacetimedb/server';

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

const spacetimedb = schema({ world, nation });
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

export const init = spacetimedb.init((ctx) => {
  ctx.db.world.insert({
    id: 0,
    year: 0,
    status: { tag: 'lobby' },
  });
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
