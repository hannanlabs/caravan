# Caravan

Caravan is a multiplayer economy game. You take over a real country and grow its GDP over 100 years. Everyone shares one live world built on [SpacetimeDB](https://spacetimedb.com), so every move shows up in every browser at once.

Pick a country and you inherit its real starting position: cash, education, health, military, technology, and a set of natural resources. From there you build it up.

## The world

Six commodities trade on a global market: oil, energy, grain, steel, medicine, and electronics. Prices are live. They rise when countries buy or supply runs short, fall when countries sell, and ride a natural wave on top so the chart always breathes. Every country is endowed differently, so a nation rich in oil can sell it cheaply while others pay up. That is comparative advantage at work.

## What you can do

Buy and sell commodities on the market. Build assets through your actions: tanks and carriers for military, hospitals and soup kitchens for healthcare, schools and universities for education, labs and data centers for technology. Assets cost money plus commodities and pay off slowly, lifting your GDP for years. Set your tax rate. Trade resources directly with other nations. Declare war, and sue for peace.

## Time and consequences

Time moves when you press Advance Year. Each year the treasury collects taxes, your endowments produce and your population consumes, asset payoffs land, the market settles, and every other country takes its turn. War is the big lever in reverse. While it lasts it drags both sides' GDP down a little more every year, and it punishes the weaker military hardest.

## Everyone plays

The other countries are run by the game. They trade by comparative advantage, buy and sell on the same market, grow their own economies, and now and then go to war. The leaderboard ranks all of them by GDP, so you always know where you stand.

## Running it

You need the [SpacetimeDB CLI](https://spacetimedb.com/install) and Node 18+.

```bash
spacetime start      # start the local host
pnpm install
spacetime dev        # builds, publishes, and regenerates bindings on save
open http://localhost:3001
```

Run the economy and bot tests with `pnpm test`. Publish to the cloud with `spacetime publish caravan-rsdsx --server maincloud`.

## Playing

1. Open the app, pick a country, and claim it.
2. Press Start to bring the world to life.
3. Buy, build, trade, tax, or fight.
4. Press Advance Year to settle the year and watch the effects ripple out.
5. Climb the leaderboard. At year 100 the richest country wins.

## How it is built

A React dashboard talks to a SpacetimeDB host over one WebSocket. All the game logic lives inside the database as a WebAssembly module, so every move is one atomic transaction and the screen just redraws whenever a table changes. The economic model and the bot brains are pure functions with unit tests.
