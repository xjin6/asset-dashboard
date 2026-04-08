import { storageGet, storageSet } from "@/lib/storage";
import { getServerCache, updatePositionsCache } from "@/lib/server-cache";

const MAX_POINTS = 60 * 24 * 30;
const CACHE_STALE_MS = 90_000;

interface DataPoint { time: number; value: number; }
interface SavingsEntry { amount: number; currency: string; }
interface SavingsAccount { name: string; entries: SavingsEntry[]; }
interface ManualHolding { symbol: string; quantity: number; }

async function refreshCacheIfStale(): Promise<void> {
  const cache = getServerCache();
  const isStale = !cache || !cache.updatedAt || (Date.now() - cache.updatedAt > CACHE_STALE_MS);
  if (!isStale) return;

  try {
    const { fetchStockPositions, fetchAccountBalance } = await import("@/lib/longbridge/trade");
    const { fetchQuotes } = await import("@/lib/longbridge/quote");

    const [positions, hkdBalances, usdBalances, cnhBalances] = await Promise.all([
      fetchStockPositions(),
      fetchAccountBalance("HKD"),
      fetchAccountBalance("USD").catch(() => []),
      fetchAccountBalance("CNH").catch(() => []),
    ]);

    const balance = hkdBalances[0];
    if (!balance) return;

    const hkdNet = balance.netAssets;
    const hkdCash = Number(balance.totalCash);
    const fxRates: Record<string, number> = { HKD: 1 };
    const usdCash = Number(usdBalances[0]?.totalCash ?? 0);
    const cnhCash = Number(cnhBalances[0]?.totalCash ?? 0);
    if (usdCash > 0) fxRates.USD = hkdCash / usdCash;
    else fxRates.USD = cache?.fxRates?.USD ?? 7.8;
    if (cnhCash > 0) { fxRates.CNH = hkdCash / cnhCash; fxRates.CNY = fxRates.CNH; }
    else { fxRates.CNH = cache?.fxRates?.CNH ?? 1.07; fxRates.CNY = fxRates.CNH; }

    const [morganHoldings, fidelityHoldings] = await Promise.all([
      storageGet<ManualHolding[]>("manual-holdings-morgan"),
      storageGet<ManualHolding[]>("manual-holdings-fidelity"),
    ]);

    const allSymbols = [
      ...positions.map(p => p.symbol),
      ...(morganHoldings ?? []).map(h => h.symbol),
      ...(fidelityHoldings ?? []).map(h => h.symbol),
    ];
    const uniqueSymbols = [...new Set(allSymbols)];
    const quotes = uniqueSymbols.length > 0 ? await fetchQuotes(uniqueSymbols) : [];

    updatePositionsCache({
      positions: positions.map(p => ({
        symbol: p.symbol,
        quantity: p.quantity,
        currentPrice: Number(p.costPrice ?? 0),
        currency: p.currency,
      })),
      totalCashHKD: Number(balance.totalCash),
      fxRates,
      quotes: quotes.map(q => ({
        symbol: q.symbol,
        lastDone: q.lastDone,
        regularLastDone: q.regularLastDone ?? q.lastDone,
        prevClose: q.prevClose,
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        volume: q.volume ?? 0,
        turnover: q.turnover ?? 0,
        timestamp: q.timestamp ?? new Date().toISOString(),
        changeAmount: q.changeAmount ?? 0,
        changePercent: q.changePercent ?? 0,
      })),
    });

    console.log("[History] Cache refreshed independently (browser away)");
  } catch (e) {
    console.error("[History] Cache refresh failed:", (e as Error).message);
  }
}

export async function recordOnce() {
  try {
    await refreshCacheIfStale();

    const cache = getServerCache();
    if (!cache || !cache.updatedAt) {
      console.log("[History] Cache not ready yet, skipping");
      return;
    }

    const { positions, totalCashHKD, fxRates, quotes } = cache;

    let lbMV = 0;
    for (const pos of positions) {
      const price = quotes.get(pos.symbol)?.lastDone ?? pos.currentPrice;
      lbMV += pos.quantity * price * (fxRates[pos.currency] ?? 1);
    }
    const lbTotal = totalCashHKD + lbMV;

    const [morganHoldings, fidelityHoldings, savingsAccounts] = await Promise.all([
      storageGet<ManualHolding[]>("manual-holdings-morgan"),
      storageGet<ManualHolding[]>("manual-holdings-fidelity"),
      storageGet<SavingsAccount[]>("savings-accounts"),
    ]);

    let manualMV = 0;
    for (const h of [...(morganHoldings ?? []), ...(fidelityHoldings ?? [])]) {
      const price = quotes.get(h.symbol)?.lastDone ?? 0;
      const currency = h.symbol.endsWith(".HK") ? "HKD" : "USD";
      manualMV += h.quantity * price * (fxRates[currency] ?? 1);
    }

    let savingsMV = 0;
    for (const acct of (savingsAccounts ?? [])) {
      for (const entry of acct.entries) {
        savingsMV += entry.amount * (fxRates[entry.currency] ?? 1);
      }
    }

    const total = lbTotal + manualMV + savingsMV;
    if (total <= 0) return;

    const history = (await storageGet<DataPoint[]>("asset-history")) ?? [];
    history.push({ time: Date.now(), value: total });
    const trimmed = history.length > MAX_POINTS ? history.slice(-MAX_POINTS) : history;
    await storageSet("asset-history", trimmed);
    console.log(`[History] Recorded HKD ${total.toFixed(0)} at ${new Date().toLocaleTimeString()}`);
  } catch (e) {
    console.error("[History] Record failed:", (e as Error).message);
  }
}

// Local dev only — not used on Vercel (serverless functions can't keep setInterval alive)
let started = false;

export function startHistoryRecorder() {
  if (started) return;
  started = true;
  console.log("[History] Background recorder started");
  setTimeout(recordOnce, 35_000);
  setInterval(recordOnce, 60_000);
}
