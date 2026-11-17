// Dip-bounce + strict-breakout BTC bot for btc-race-24h-20261117-0603.
// Long-only, one full-size position, on 1-minute cbBTC bars (agent-fun/bars-replay/v1).
// The hello message carries the universe and capital; every batch carries one bar
// plus the fills of the previous batch's orders, and each reply carries the orders
// decided on that bar. A fill lands at the next bar's open, so every signal is
// judged on closes and pays roughly 34 bps a round trip (fees + slippage + impact
// at this pool's depth), which is why entries wait for a real dip or a real
// breakout and exits take profit early instead of chasing far targets.
//
// Entries (flat only, never in the last 30 bars):
//   dip-bounce: close >= 100 bps under the 60-bar high, back above the 13-bar EMA
//   breakout:   close above the 60-bar high close and 30-bar return >= +100 bps
// Exits (holding): take profit +150 bps, 80 bps trailing stop under the peak
// close since entry, hard stop -120 bps, or 600 bars held. Five bars of
// cooldown after any exit. (A low-break exit was tried and dropped: on 1-minute
// bars it fires on noise and cuts winners.)

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const DIP_LOOKBACK = 60;
const DIP_BPS = 100n;
const EMA_SPAN = 13;
const BREAK_LOOKBACK = 60;
const BREAK_RET_BPS = 100n;
const TP_BPS = 150n;
const TRAIL_BPS = 80n;
const STOP_BPS = 120n;
const COOLDOWN_BARS = 5;
const MAX_HOLD_BARS = 600;
const NO_ENTRY_FROM_SEQ = 1409;
const MAX_SLIPPAGE_BPS = 200;
const BPS = 10_000n;

const closes: bigint[] = [];
const highs: bigint[] = [];
let ema: bigint | null = null;
let entryPx: bigint | null = null;
let peakPx: bigint | null = null;
let heldBars = 0;
let coolLeft = 0;

function maxOf(xs: bigint[]): bigint {
  let m = xs[0]!;
  for (const x of xs) if (x > m) m = x;
  return m;
}

// bps move of `now` against `ref`, truncated: (now - ref) * 10000 / ref.
function bpsMove(now: bigint, ref: bigint): bigint {
  return ((now - ref) * BPS) / ref;
}

function onBatch(state: BarsState, batch: Batch): OrderInput[] {
  const bar = batch.bars.find((b) => b.symbol === SYMBOL);
  if (bar === undefined) return [];
  const close = BigInt(bar.c);
  closes.push(close);
  highs.push(BigInt(bar.h));
  ema = ema === null ? close : ema + ((close - ema) * 2n) / BigInt(EMA_SPAN + 1);

  // Fills of the orders decided on the previous bar arrive here: a filled buy
  // fixes the entry price (the fill price, not the decision close) and resets
  // the peak; a filled sell clears the trade.
  for (const f of batch.fills) {
    if (f.symbol !== SYMBOL || f.status !== 'filled') continue;
    if (f.side === 'buy') {
      entryPx = BigInt(f.price);
      peakPx = entryPx;
      heldBars = 0;
    } else {
      entryPx = null;
      peakPx = null;
      heldBars = 0;
    }
  }

  const pos = state.positions.get(SYMBOL);
  const qty = pos === undefined ? 0n : pos.qty;
  if (state.warmingUp) return [];

  if (qty > 0n && entryPx !== null && peakPx !== null) {
    heldBars += 1;
    if (close > peakPx) peakPx = close;
    const takeProfit = bpsMove(close, entryPx) >= TP_BPS;
    const trailedOff = bpsMove(close, peakPx) <= -TRAIL_BPS;
    const stoppedOut = bpsMove(close, entryPx) <= -STOP_BPS;
    const stale = heldBars >= MAX_HOLD_BARS;
    if (takeProfit || trailedOff || stoppedOut || stale) {
      coolLeft = COOLDOWN_BARS;
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  }

  // Flat: wait out the cooldown, then look for an entry.
  if (coolLeft > 0) {
    coolLeft -= 1;
    return [];
  }
  if (entryPx !== null) {
    entryPx = null;
    peakPx = null;
  }
  if (state.seq >= NO_ENTRY_FROM_SEQ) return [];
  if (closes.length <= Math.max(DIP_LOOKBACK, BREAK_LOOKBACK, 30)) return [];
  if (ema === null) return [];

  const hi = maxOf(highs.slice(highs.length - DIP_LOOKBACK));
  const dipped = bpsMove(close, hi) <= -DIP_BPS;
  const bounced = close >= ema;
  const prevHigh = maxOf(closes.slice(closes.length - BREAK_LOOKBACK - 1, closes.length - 1));
  const monthAgo = closes[closes.length - 31]!;
  const brokeOut = close > prevHigh && bpsMove(close, monthAgo) >= BREAK_RET_BPS;

  if (dipped && bounced || brokeOut) {
    const room = state.weightRoom(SYMBOL);
    const spend = state.cash < room ? state.cash : room;
    if (spend < 1_000_000n) return [];
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS }];
  }
  return [];
}

await runBars({ onBatch });
