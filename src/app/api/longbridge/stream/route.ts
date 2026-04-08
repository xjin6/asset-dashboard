import { getQuoteContext } from "@/lib/longbridge/client";
import { fetchStockPositions } from "@/lib/longbridge/trade";
import { fetchQuotes } from "@/lib/longbridge/quote";
import { getServerCache, updateQuotesCache } from "@/lib/server-cache";

const SUB_TYPE_QUOTE = 0;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const extraSymbols = searchParams.get("symbols")?.split(",").filter(Boolean) ?? [];
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let symbols: string[];
        let initialQuotes: ReturnType<typeof Array.prototype.map>;

        // Try to use server cache first to avoid duplicate Longbridge API calls
        const cache = getServerCache();
        if (cache && cache.positions.length > 0 && cache.quotes.size > 0) {
          symbols = [...new Set([...cache.positions.map((p) => p.symbol), ...extraSymbols])];
          initialQuotes = symbols.map((s) => cache.quotes.get(s)).filter(Boolean);
        } else {
          // Cache not ready yet — fall back to direct API (only on cold start)
          const positions = await fetchStockPositions();
          const lbSymbols = positions.map((p) => p.symbol);
          symbols = [...new Set([...lbSymbols, ...extraSymbols])];
          const fetched = await fetchQuotes(symbols);
          initialQuotes = fetched;
        }

        if (symbols.length === 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "empty" })}\n\n`));
          controller.close();
          return;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "init", quotes: initialQuotes })}\n\n`)
        );

        const prevCloseMap = new Map(
          (initialQuotes as Array<{ symbol: string; prevClose: number }>)
            .map((q) => [q.symbol, q.prevClose])
        );

        const ctx = await getQuoteContext();

        ctx.setOnQuote((err, event) => {
          if (err) return;
          const symbol = event.symbol;
          const q = event.data;
          const lastDone = q.lastDone.toNumber();
          const prevClose = prevCloseMap.get(symbol) ?? 0;
          const changeAmount = lastDone - prevClose;
          const changePercent = prevClose !== 0 ? (changeAmount / prevClose) * 100 : 0;

          // Always update serverCache so background recorder has fresh prices
          // even when browser tab is away or closed
          updateQuotesCache([{
            symbol,
            lastDone,
            regularLastDone: lastDone,
            prevClose,
            open: q.open.toNumber(),
            high: q.high.toNumber(),
            low: q.low.toNumber(),
            volume: q.volume,
            turnover: q.turnover.toNumber(),
            timestamp: q.timestamp.toISOString(),
            changeAmount,
            changePercent,
          }]);

          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "quote",
                  quote: {
                    symbol,
                    lastDone,
                    prevClose,
                    open: q.open.toNumber(),
                    high: q.high.toNumber(),
                    low: q.low.toNumber(),
                    volume: q.volume,
                    turnover: q.turnover.toNumber(),
                    timestamp: q.timestamp.toISOString(),
                    changeAmount,
                    changePercent,
                  },
                })}\n\n`
              )
            );
          } catch {
            // Stream closed by client
          }
        });

        await ctx.subscribe(symbols, [SUB_TYPE_QUOTE]);

        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);
      } catch (error) {
        console.error("SSE stream error:", error);
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(error) })}\n\n`)
          );
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
