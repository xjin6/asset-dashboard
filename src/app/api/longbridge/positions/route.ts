import { NextResponse } from "next/server";
import { fetchStockPositions, fetchAccountBalance } from "@/lib/longbridge/trade";
import { fetchQuotes } from "@/lib/longbridge/quote";
import type { EnrichedPosition } from "@/lib/longbridge/types";
import { updatePositionsCache, type CachedQuote } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

// Server-side response cache — deduplicate requests from multiple clients / tabs
// All clients share the same Longbridge API call; at most 1 call per 10s
let responseCache: { data: unknown; at: number } | null = null;
const RESPONSE_TTL = 10_000;

// On Vercel, record history as a side-effect of fetching positions (replaces setInterval)
let lastHistoryRecorded = 0;
const HISTORY_INTERVAL = 60_000;

// FX rates cache — refresh every 60s
let lastGoodRates: Record<string, number> = { HKD: 1, USD: 7.8, CNY: 1.07, CNH: 1.07 };
let fxLastFetched = 0;
const FX_TTL = 60_000;

export async function GET() {
  try {
    const now = Date.now();

    // Return cached response if fresh — prevents multiple tabs from multiplying API calls
    if (responseCache && now - responseCache.at < RESPONSE_TTL) {
      return NextResponse.json(responseCache.data);
    }

    const needFxRefresh = now - fxLastFetched >= FX_TTL;

    // Always fetch positions + HKD balance; only fetch USD/CNH every 30s
    const [positions, hkdBalances, usdBalances, cnhBalances] = await Promise.all([
      fetchStockPositions(),
      fetchAccountBalance("HKD"),
      needFxRefresh ? fetchAccountBalance("USD").catch(() => []) : Promise.resolve([] as never[]),
      needFxRefresh ? fetchAccountBalance("CNH").catch(() => []) : Promise.resolve([] as never[]),
    ]);

    const balance = hkdBalances[0];

    // Compute FX rates inline from the same batch — no extra API calls, no cache needed
    const fxRates: Record<string, number> = { HKD: 1 };
    if (balance) {
      const hkdCash = balance.totalCash;

      const usdCash = usdBalances[0]?.totalCash;
      if (hkdCash && usdCash && Number(usdCash) !== 0) {
        fxRates.USD = Number(hkdCash) / Number(usdCash);
      } else {
        fxRates.USD = lastGoodRates.USD;
      }

      const cnhCash = cnhBalances[0]?.totalCash;
      if (hkdCash && cnhCash && Number(cnhCash) !== 0) {
        fxRates.CNH = Number(hkdCash) / Number(cnhCash);
        fxRates.CNY = fxRates.CNH;
      } else {
        fxRates.CNH = lastGoodRates.CNH;
        fxRates.CNY = lastGoodRates.CNY;
      }

      // Update cached rates when a fresh fetch was done
      if (needFxRefresh && usdCash && cnhCash) {
        lastGoodRates = { ...fxRates };
        fxLastFetched = now;
        console.log("[FX Rates]", fxRates);
      }
    }

    if (positions.length === 0) {
      return NextResponse.json({ positions: [], balance, fxRates });
    }

    const symbols = positions.map((p) => p.symbol);
    const quotes = await fetchQuotes(symbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    const enriched: EnrichedPosition[] = positions.map((pos) => {
      const quote = quoteMap.get(pos.symbol);
      const currentPrice = quote?.lastDone ?? 0;
      const prevClose = quote?.prevClose ?? 0;
      const marketValue = pos.quantity * currentPrice;
      const costValue = pos.quantity * pos.costPrice;
      const unrealizedPL = marketValue - costValue;
      const unrealizedPLPercent = costValue !== 0 ? (unrealizedPL / costValue) * 100 : 0;
      const dailyPL = pos.quantity * (currentPrice - prevClose);
      const prevValue = pos.quantity * prevClose;
      const dailyPLPercent = prevValue !== 0 ? (dailyPL / prevValue) * 100 : 0;

      return {
        ...pos,
        currentPrice,
        prevClose,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent,
        dailyPL,
        dailyPLPercent,
      };
    });

    updatePositionsCache({
      positions: enriched.map((p) => ({ symbol: p.symbol, quantity: p.quantity, currentPrice: p.currentPrice, currency: p.currency })),
      totalCashHKD: Number(balance.totalCash),
      fxRates,
      quotes: quotes.map((q): CachedQuote => ({
        symbol: q.symbol,
        lastDone: q.lastDone,
        regularLastDone: q.regularLastDone,
        prevClose: q.prevClose,
        open: q.open,
        high: q.high,
        low: q.low,
        volume: q.volume,
        turnover: q.turnover,
        timestamp: q.timestamp,
        changeAmount: q.changeAmount,
        changePercent: q.changePercent,
      })),
    });

    const responseData = { positions: enriched, balance, fxRates };
    responseCache = { data: responseData, at: now };

    // On Vercel, trigger history recording here (setInterval doesn't survive serverless)
    if (process.env.VERCEL && now - lastHistoryRecorded >= HISTORY_INTERVAL) {
      lastHistoryRecorded = now;
      import("@/lib/background/history-recorder")
        .then(({ recordOnce }) => recordOnce())
        .catch(console.error);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to fetch positions:", error);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}
