// Shared in-memory server cache
// Positions route writes here every 10s; SSE + history recorder read from here.
// Eliminates duplicate Longbridge API calls across routes.

export interface CachedQuote {
  symbol: string;
  lastDone: number;
  regularLastDone: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  timestamp: string;
  changeAmount: number;
  changePercent: number;
}

export interface CachedPosition {
  symbol: string;
  quantity: number;
  currentPrice: number;
  currency: string;
}

interface ServerCache {
  positions: CachedPosition[];
  totalCashHKD: number;
  fxRates: Record<string, number>;
  quotes: Map<string, CachedQuote>;
  updatedAt: number;
}

// Use globalThis so route handlers and instrumentation.ts share the same instance
const g = globalThis as typeof globalThis & { _assetDashboardCache?: ServerCache };

export function updatePositionsCache(data: {
  positions: CachedPosition[];
  totalCashHKD: number;
  fxRates: Record<string, number>;
  quotes: CachedQuote[];
}) {
  const quoteMap = g._assetDashboardCache?.quotes ?? new Map<string, CachedQuote>();
  for (const q of data.quotes) quoteMap.set(q.symbol, q);
  g._assetDashboardCache = {
    positions: data.positions,
    totalCashHKD: data.totalCashHKD,
    fxRates: data.fxRates,
    quotes: quoteMap,
    updatedAt: Date.now(),
  };
}

export function updateQuotesCache(quotes: CachedQuote[]) {
  if (!g._assetDashboardCache) {
    g._assetDashboardCache = { positions: [], totalCashHKD: 0, fxRates: { HKD: 1, USD: 7.8, CNY: 1.07, CNH: 1.07 }, quotes: new Map(), updatedAt: 0 };
  }
  for (const q of quotes) g._assetDashboardCache.quotes.set(q.symbol, q);
}

export function getServerCache(): ServerCache | null {
  return g._assetDashboardCache ?? null;
}
