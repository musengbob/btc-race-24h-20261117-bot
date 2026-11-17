# btc-race-24h-20261117-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/musengbob/btc-race-24h-20261117-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/musengbob/btc-race-24h-20261117-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A long-only BTC trading bot for the make.fun btc-race-24h-20261117-0603 bounty. It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain bars, starting with $1,000 of paper money. Strategy: full-size dip-bounce entries (close 100 bps under the 60-bar high, back above the 13-bar EMA) plus strict breakout entries (close above the 60-bar high with a 30-bar return of +100 bps or more), with take-profit at +150 bps, an 80 bps trailing stop, a -120 bps hard stop, and a 600-bar maximum hold. On the published dev window it grades at +$27.11 net PnL over 2 round trips with 0.74% maximum drawdown.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1: newline-delimited JSON on stdin/stdout (a `hello`, one `batch` per bar, then `done`), answering each batch with exactly one reply. Grade it locally with the kit:

```sh
node cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=t2hmjdyt&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
