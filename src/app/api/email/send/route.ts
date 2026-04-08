import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/email-template";
import { fetchStockPositions, fetchAccountBalance } from "@/lib/longbridge/trade";
import { fetchQuotes } from "@/lib/longbridge/quote";
import { getServerCache } from "@/lib/server-cache";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Try to use server cache first (faster), fall back to fresh API calls
    const cache = getServerCache();
    let positions: { symbolName: string; symbol: string; quantity: number; currentPrice: number; currency: string; marketValue: number; dailyPL: number; dailyPLPercent: number; unrealizedPL: number; unrealizedPLPercent: number; }[] = [];
    let lbTotal = 0;
    let dailyPL = 0;
    let totalPL = 0;

    if (cache && cache.positions.length > 0) {
      // Use cached data
      const fxRates = cache.fxRates;
      for (const pos of cache.positions) {
        const q = cache.quotes.get(pos.symbol);
        const price = q ? q.lastDone : pos.currentPrice;
        const prevClose = q ? q.prevClose : price;
        const mv = pos.quantity * price;
        const daily = pos.quantity * (price - prevClose);
        const dailyPct = prevClose !== 0 ? (price - prevClose) / prevClose * 100 : 0;
        positions.push({ symbolName: pos.symbol.split(".")[0], symbol: pos.symbol, quantity: pos.quantity, currentPrice: price, currency: pos.currency, marketValue: mv, dailyPL: daily, dailyPLPercent: dailyPct, unrealizedPL: 0, unrealizedPLPercent: 0 });
        lbTotal += mv * (fxRates[pos.currency] ?? 1);
        dailyPL += daily * (fxRates[pos.currency] ?? 1);
      }
      lbTotal += cache.totalCashHKD;
    } else {
      // Fresh fetch
      const [rawPositions, hkdBalances] = await Promise.all([
        fetchStockPositions(),
        fetchAccountBalance("HKD"),
      ]);
      const balance = hkdBalances[0];
      if (rawPositions.length > 0) {
        const quotes = await fetchQuotes(rawPositions.map(p => p.symbol));
        const qMap = new Map(quotes.map(q => [q.symbol, q]));
        for (const pos of rawPositions) {
          const q = qMap.get(pos.symbol);
          const price = q ? q.lastDone : pos.costPrice;
          const prevClose = q ? q.prevClose : pos.costPrice;
          const mv = pos.quantity * price;
          const daily = pos.quantity * (price - prevClose);
          const dailyPct = prevClose !== 0 ? (price - prevClose) / prevClose * 100 : 0;
          const unreal = pos.quantity * (price - pos.costPrice);
          const unrealPct = pos.quantity * pos.costPrice !== 0 ? unreal / (pos.quantity * pos.costPrice) * 100 : 0;
          positions.push({ symbolName: pos.symbolName, symbol: pos.symbol, quantity: pos.quantity, currentPrice: price, currency: pos.currency, marketValue: mv, dailyPL: daily, dailyPLPercent: dailyPct, unrealizedPL: unreal, unrealizedPLPercent: unrealPct });
        }
        lbTotal = (balance?.totalCash ?? 0) + positions.reduce((s, p) => s + p.marketValue * 7.82, 0);
      }
    }

    const totalAssets = lbTotal; // simplified; full calc requires savings etc.
    const now = new Date().toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong", dateStyle: "medium", timeStyle: "short" });

    const html = buildEmailHtml({
      totalAssets,
      totalAssetsCurrency: "HKD",
      dailyPL,
      dailyPLPercent: totalAssets > 0 ? dailyPL / totalAssets * 100 : 0,
      totalPL,
      totalPLPercent: 0,
      positions,
      savingsTotal: 0,
      morganTotal: 0,
      fidelityTotal: 0,
      lbTotal,
      generatedAt: now,
    });

    await sendEmail({
      subject: `📊 Asset Report · ${now}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Email] Send failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
