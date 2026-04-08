import { getQuoteContext } from "./client";
import type { QuoteData } from "./types";

export async function fetchQuotes(symbols: string[]): Promise<QuoteData[]> {
  if (symbols.length === 0) return [];

  const ctx = await getQuoteContext();
  const quotes = await ctx.quote(symbols);

  return quotes.map((q) => {
    const regularLastDone = q.lastDone.toNumber();
    const regularPrevClose = q.prevClose.toNumber();
    const regularTimestamp = q.timestamp;

    // Check if pre-market or post-market quote exists and is MORE RECENT
    // than the regular session timestamp. If so:
    //   - currentPrice = extended hours price
    //   - prevClose = regularLastDone (which is the last regular session close = App's "昨收")
    // This is because Longbridge's `prevClose` field lags one session behind during
    // pre/post market hours (it shows Thursday's close on Monday pre-market).
    let currentPrice = regularLastDone;
    let prevClose = regularPrevClose;

    const extCandidates: { price: number; time: Date }[] = [];
    if (q.preMarketQuote?.lastDone) {
      const p = q.preMarketQuote.lastDone.toNumber();
      if (p > 0) extCandidates.push({ price: p, time: q.preMarketQuote.timestamp });
    }
    if (q.overnightQuote?.lastDone) {
      const p = q.overnightQuote.lastDone.toNumber();
      if (p > 0) extCandidates.push({ price: p, time: q.overnightQuote.timestamp });
    }
    if (q.postMarketQuote?.lastDone) {
      const p = q.postMarketQuote.lastDone.toNumber();
      if (p > 0) extCandidates.push({ price: p, time: q.postMarketQuote.timestamp });
    }

    if (extCandidates.length > 0) {
      extCandidates.sort((a, b) => b.time.getTime() - a.time.getTime());
      const best = extCandidates[0];
      if (best.time.getTime() > regularTimestamp.getTime()) {
        // Extended hours is more recent — use it as current price
        // and use regular lastDone as prevClose (= App's "昨收")
        currentPrice = best.price;
        prevClose = regularLastDone;
      }
    }

    const changeAmount = currentPrice - prevClose;
    const changePercent = prevClose !== 0 ? (changeAmount / prevClose) * 100 : 0;

    return {
      symbol: q.symbol,
      lastDone: currentPrice,
      regularLastDone: regularLastDone,
      prevClose,
      open: q.open.toNumber(),
      high: q.high.toNumber(),
      low: q.low.toNumber(),
      volume: q.volume,
      turnover: q.turnover.toNumber(),
      timestamp: q.timestamp.toISOString(),
      changeAmount,
      changePercent,
    };
  });
}
