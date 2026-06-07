# Caravan

Caravan is a multiplayer economy game. You take over a real country and try to grow its GDP as high as you can over 100 in-game years. Nobody really "wins" — the number is the whole point.

Everyone plays in the same live world, built on [SpacetimeDB](https://spacetimedb.com), so every move shows up in every browser instantly.

## The idea

Pick a country and you inherit its real starting position — money scaled from its actual GDP, plus starting education, health, and tax levels. From there you grow it:

- **Trade** goods or energy with another nation. They accept and you both swap resources; they reject and you lose a little trust.
- **Spend on education** to bump your GDP multiplier.
- **Spend on healthcare** for another multiplier (maxes out at +50%).
- **Set taxes** — fills your treasury, but lean too hard and it drags your GDP down.

Money is fuel, GDP is score. You burn one to grow the other.

Time moves when you do: every action pushes the world forward a quarter-year, so it takes roughly 400 moves to reach year 100. Hit 100 and the world freezes with the richest nation on top.

## Trust

Every pair of countries shares a trust score (0–100). Finish a trade and you both go up; reject one and you drop in the other's eyes. The dashboard splits everyone into Allies, Rivals, and Neutral, and the world map colors them to match.

## GDP formula

```
gdp = base × (1 + education) × (1 + 0.5 × health) × (1 − 0.5 × tax_rate)
    + (goods + energy) × 5
    + money × 0.1
```

## How it's built

A React dashboard talks to a SpacetimeDB host over one WebSocket. The game logic lives inside the database as a WebAssembly module, so every move is an atomic transaction and the UI just re-renders whenever a table changes.

Right now the world ships with 26 seeded bot nations you can trade with like real players. LLM-driven AI nations are sketched in the RFC but not built yet.

## Running it

You need the [SpacetimeDB CLI](https://spacetimedb.com/install) and Node 18+.

```bash
spacetime start      # start the local host
pnpm install
spacetime dev        # runs everything, republishes on save
open http://localhost:3001
```

## Playing

1. Open the app in two windows — one normal, one incognito — so you get two identities.
2. Type a country name, hit Claim. Claiming a seeded country takes its seat and stats.
3. One window clicks Start. The world goes live.
4. Use the action buttons to trade, invest in education or health, and set taxes.
5. Each move nudges the year forward — watch the GDP chart climb and the map shift as trust changes.
6. At year 100, the winner banner drops.