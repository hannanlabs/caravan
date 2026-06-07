# Caravan

A live multiplayer economic simulation. You run a real-world nation and try to push its GDP as high as possible over a 100-year run. There's no winner condition — the score is the point.

Built on [SpacetimeDB](https://spacetimedb.com): every player connects to the same world database in real time, all moves are atomic reducer calls, and every browser sees state update live.

## What you do

Pick a country (USA, China, Pakistan, Japan, …) and inherit its real-world starting position: money supply scaled from nominal GDP, plus starting education, health, and tax-rate values. Then you make moves:

- **Trade** goods or energy with another nation. You file an offer; they approve or reject. Approval swaps resources atomically. Rejection costs you a little trust.
- **Invest in education** to raise your education index — a direct GDP multiplier.
- **Invest in healthcare** to raise your health index — another GDP multiplier (capped at +50%).
- **Set tax rate** — fills your treasury via the production formula, but drags GDP down when high.

Money supply is your fuel. GDP is your score. You spend the first to grow the second.

## How time works

The clock is driven by activity, not real time. Every action and every trade response advances the world by +0.25 years, so ~400 actions take you from year 0 to year 100. At year 100 the world ends, the leaderboard freezes, and the highest-GDP nation "wins" (cosmetically).

Each time a fractional year crosses an integer (e.g. 0.75 → 1.00), every nation recomputes its GDP and the value is written to history for the chart.

## Trust

Each pair of nations shares one trust value (0–100, starting at 50). A completed trade bumps both sides +5; a rejection costs the proposer 5 in the rejecter's eyes. The dashboard sorts everyone into Allies (>60), Rivals (<40), and Neutral, and the world map colors regions to match.

## GDP formula

```
gdp = base × (1 + education) × (1 + 0.5 × health) × (1 − 0.5 × tax_rate)
    + (goods + energy) × 5
    + money × 0.1
```

## Architecture

A Next.js + React 18 browser dashboard talks to a SpacetimeDB host over a single WebSocket. SpacetimeDB runs the TypeScript game module as a WebAssembly bundle; reducers (`claim_nation`, `propose_trade`, …) run transactionally inside the database. The UI subscribes to tables via `useTable(...)` hooks and re-renders on every change.

The game currently ships with 26 seeded bot nations you can trade with as if they were real players. The RFC's LLM-driven AI nations (via a Node orchestrator) are deferred to a future round.

### Tables

| Table | Purpose |
|---|---|
| `world` | Singleton: `year`, `status` (Lobby/Running/Ended) |
| `nation` | Per-player state: money, goods, energy, education, tax_rate, health, gdp |
| `trade_offer` | Pending offers between two identities; auto-resolved on response |
| `trust` | Per-pair trust value, keyed by `(from_owner, to_owner)` |
| `world_event` | Append-only log for the live events feed |
| `gdp_history` | Per-nation GDP samples at each year tick |

## Running locally

Requires the [SpacetimeDB CLI](https://spacetimedb.com/install) and Node 18+.

```bash
spacetime start          # start the local host (one terminal)
pnpm install
spacetime dev            # runs the dev stack, auto-publishes on save
open http://localhost:3001
```

Next.js runs on 3001 because SpacetimeDB already uses 3000. Append `?debug=1` to the URL for WebSocket and table-row diagnostics.

### Useful CLI

```bash
# list nations
spacetime sql caravan-rsdsx "select name, gdp from nation"

# follow events live
spacetime logs caravan-rsdsx -f

# wipe and reseed (also available from the in-game Reset button)
spacetime publish --module-path spacetimedb --server local caravan-rsdsx --delete-data --yes
```

## How to play

1. Open the app in two browser windows — one regular, one incognito — to get two SpacetimeDB identities.
2. In each window, type a country name in the Actions panel and click Claim. Claiming a seeded name takes over that seat and inherits its starting position.
3. One window clicks Start the run to move the world from Lobby to Running.
4. Use the Actions buttons to open the Trade, Education, Healthcare, and Taxes modals.
5. Each action advances the year by 0.25. Watch the GDP chart grow and the map recolor as trust shifts.
6. At year 100, the winner banner appears.

## Seeded countries

USA, China, Germany, Japan, India, United Kingdom, France, Italy, Brazil, Canada, Pakistan, Bangladesh, South Korea, Indonesia, Vietnam, Saudi Arabia, Turkey, Iran, Israel, Russia, Spain, Poland, Mexico, Nigeria, South Africa, Australia.

The registry in `lib/countries.ts` knows ~50 countries (flag, ISO code, government type, map geo name). Add entries there or to the `SEED_NATIONS` array on the server to grow the roster.

## License

Personal project, no license set. Ask before reusing.