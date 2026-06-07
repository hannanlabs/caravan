# 🚙 Caravan

> A live multiplayer economic simulation where you run a real-world nation and try to drive your GDP as high as possible over a 100-year run.

Caravan is a strategy game built on [SpacetimeDB](https://spacetimedb.com) — every player connects to the same world database in real time, all moves are atomic reducer calls, and every browser sees state updates live as they happen. There's no winner — your only goal is to push your country's GDP as high as it'll go.

[Reference RFC](https://www.notion.so/Caravan-RFC) · 26 seeded countries · Trade · Trust · Live event feed · World map

---

## The core loop

You pick a country (USA, China, Pakistan, Japan, …) and inherit its real-world starting position — money supply scaled from nominal GDP, plus initial education, health, and tax-rate values reflecting that country's profile. Then you make moves:

- 🤝 **Trade** Goods or Energy with another nation. You file an offer (`give X goods for Y energy`), they approve or reject. Approval swaps resources atomically; rejection burns a small bit of trust.
- 📚 **Invest in Education** to raise your education index — a direct GDP multiplier.
- ❤ **Invest in Healthcare** to raise your health index — another GDP multiplier (capped at +50% at full health).
- 🏛 **Set tax rate** — tax rate fills your treasury implicitly via the production formula but drags GDP down at high levels.

**Money supply is your fuel. GDP is your score. You burn the first to grow the second.**

## Time is driven by activity

Years don't pass on a clock. Every action and every trade response advances the world year by **+0.25**, so ~400 actions take the world from year 0 to year 100. Hit year 100 and the world flips to `Ended`; the leaderboard freezes; the highest-GDP nation wins the run (cosmetic — there's no real winner, the score is the point).

When a fractional year crosses an integer boundary (0.75 → 1.00), an internal `tick_all()` runs: every nation recomputes its GDP and the new value gets written to `gdp_history` for the visualization.

## Trust

Each pair of nations has one trust value, 0–100, starting at 50.
- ✅ **Completed trade** → both sides bump up by +5
- ❌ **Rejection** → proposer loses 5 in the rejecter

The dashboard splits the country roster into **Allies** (trust > 60), **Rivals** (< 40), and **Neutral** (everyone else). The world map colors regions to match.

## Architecture

```
┌──────────────────────┐       WebSocket        ┌─────────────────────────┐
│  Next.js + React 18  │  ◄──────────────────►  │  SpacetimeDB (WASM)     │
│  (browser dashboard) │   live subscriptions   │  rules, tables, atomic  │
│                      │   typed reducer calls  │  reducers, server time  │
└──────────────────────┘                        └─────────────────────────┘
```

**SpacetimeDB** is a relational database that hosts your TypeScript module as a WebAssembly bundle. Reducers (`claim_nation`, `propose_trade`, …) run inside the database transactionally — no network calls, no clocks, no randomness besides what the host provides. Tables are pushed live to subscribed clients.

**Next.js + React 18** renders the dashboard. The whole UI lives behind `useTable(tables.X)` hooks that auto-subscribe to a table and re-render on every change. Reducer calls go over the same WebSocket and the server's response triggers the cascade of updates.

> The RFC describes an external **Node orchestrator** that drives AI nations via an LLM through the same reducers humans use. This is **deferred** in the current build — the world is human-only for now, with 26 seeded bot nations that you can trade with as if they were real players. AI orchestration lands in a future round.

## Schema (current)

| Table | Purpose |
|---|---|
| `world` | Singleton: `year`, `status` (Lobby/Running/Ended) |
| `nation` | Per-player state: money, goods, energy, education, tax_rate, health, gdp |
| `trade_offer` | Pending offers between two identities; auto-resolved on respond |
| `trust` | Per-pair trust value (0–100), keyed by `(from_owner, to_owner)` |
| `world_event` | Append-only event log for the live "World Events" feed |
| `gdp_history` | Per-nation GDP samples at every year tick — drives the visualization |

GDP formula:
```
gdp = base × (1 + education) × (1 + 0.5 × health) × (1 − 0.5 × tax_rate)
    + (goods + energy) × 5
    + money × 0.1
```

## Repo layout

```
caravan/
├── spacetimedb/src/index.ts          # SpacetimeDB TypeScript module (tables + reducers)
├── src/module_bindings/              # auto-generated client bindings
├── app/                              # Next.js routes
│   ├── page.tsx                      # server component, SSR-fetches world
│   ├── NationDashboard.tsx           # main client component, wires everything
│   └── WorldMap.tsx                  # react-simple-maps + world-atlas
├── components/                       # reusable modal primitives
│   ├── Modal.tsx
│   ├── shared.tsx                    # Section, Empty, Field, ProgressBar, Stat, styles
│   ├── TradeModal.tsx
│   ├── EducationModal.tsx
│   ├── HealthcareModal.tsx
│   ├── TaxesModal.tsx
│   ├── StatsModal.tsx
│   └── dashboard/                    # dashboard-specific layout pieces
│       ├── Header.tsx
│       ├── RelationshipCards.tsx     # Allies / Rivals / Neutral
│       ├── MetricsCard.tsx
│       ├── WorldEventsCard.tsx
│       ├── GdpHistoryCard.tsx
│       ├── Footer.tsx
│       └── DebugStrip.tsx
└── lib/
    ├── countries.ts                  # ~50 countries: flag emoji, ISO code, gov type
    ├── format.ts                     # money/GDP/time formatting helpers
    └── spacetimedb-server.ts         # SSR fetch helper
```

## Running locally

You need [SpacetimeDB CLI](https://spacetimedb.com/install) and Node 18+.

```bash
# 1. start the local SpacetimeDB host (one terminal)
spacetime start

# 2. install + run the dev stack (auto-publishes module on save)
pnpm install
spacetime dev

# 3. visit
open http://localhost:3000
```

Append `?debug=1` to see WebSocket / table-row diagnostics at the top of the dashboard.

### Useful CLI

```bash
# list nations
spacetime sql caravan-rsdsx "select name, gdp from nation"

# follow events live
spacetime logs caravan-rsdsx -f

# wipe + reseed (also doable from the in-game Reset button in the footer)
spacetime publish --module-path spacetimedb --server local caravan-rsdsx --delete-data --yes
```

## What's seeded

26 real countries with starting stats roughly scaled to their real-world economies:

USA · China · Germany · Japan · India · United Kingdom · France · Italy · Brazil · Canada · **Pakistan** · Bangladesh · South Korea · Indonesia · Vietnam · Saudi Arabia · Turkey · Iran · Israel · Russia · Spain · Poland · Mexico · Nigeria · South Africa · Australia

The country registry in `lib/countries.ts` knows ~50 countries (flag + ISO + government type + world-map geo name); add more entries to either the registry or the `SEED_NATIONS` array on the server to grow the roster.

## How to play

1. Open `localhost:3000` in two browser windows (use one regular + one incognito to get two SpacetimeDB identities).
2. Each window: type a country name in the Actions panel (e.g. "USA" or "Pakistan") and click Claim. Claiming an existing seed name **takes over** that seat — you inherit its starting position.
3. One window clicks **Start the run**. World goes from `Lobby` to `Running`.
4. From the Actions buttons in the top-right, open the modals:
   - **Trade** → propose offers to other nations; approve/reject incoming offers.
   - **Education** / **Healthcare** → spend money to raise that score (each 100 money → +1.0%).
   - **Taxes** → drag a slider, watch the GDP-drag preview update.
5. Each action ticks the year by 0.25. Watch the GDP-over-time card grow. The map recolors as your trust shifts.
6. When year 100 lands, the winner banner appears across the top.

## Status of the RFC

| RFC feature | Status |
|---|---|
| Money supply seeded from real economies | ✅ Done (26 seeds) |
| Action → year advances by 0.25 | ✅ Done |
| Trade offers between identities | ✅ Done |
| Trust ± deltas on accept/reject | ✅ Done |
| GDP formula `base × (1+edu) − tax_drag + resource_value` | ✅ Done (plus health multiplier) |
| Tick reducer per integer-year crossing | ✅ Done |
| Live dashboard | ✅ Done (header, world map, leaderboards, GDP chart, event feed) |
| World map colored by relationship | ✅ Done (react-simple-maps + world-atlas) |
| AI nations driven by LLM via Node orchestrator | ⏳ Deferred |
| Per-country LLM prompts | ⏳ Deferred (registry has the slot ready) |

## License

Personal project, no license set. Ask before reusing.
