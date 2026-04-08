import { NextResponse } from "next/server";
import { fetchQuotes } from "@/lib/longbridge/quote";
import { updateQuotesCache, type CachedQuote } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json(
        { error: "Missing 'symbols' query parameter" },
        { status: 400 }
      );
    }

    const symbols = symbolsParam.split(",").filter(Boolean);
    const quotes = await fetchQuotes(symbols);
    updateQuotesCache(quotes.map((q): CachedQuote => ({
      symbol: q.symbol, lastDone: q.lastDone, regularLastDone: q.regularLastDone,
      prevClose: q.prevClose, open: q.open, high: q.high, low: q.low,
      volume: q.volume, turnover: q.turnover, timestamp: q.timestamp,
      changeAmount: q.changeAmount, changePercent: q.changePercent,
    })));
    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Failed to fetch quotes:", error);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
