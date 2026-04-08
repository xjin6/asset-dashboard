"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtime } from "@/lib/providers/realtime-provider";
import type { EnrichedPosition, QuoteData } from "@/lib/longbridge/types";

interface ManualHolding {
  symbol: string;
  quantity: number;
}

interface StaticInfoEntry {
  name: string;
  currency: string;
}

export function useManualEnriched(holdings: ManualHolding[]) {
  const symbols = holdings.map((h) => h.symbol);
  const { quotes: liveQuotes } = useRealtime();

  const { data: quotesData } = useQuery<QuoteData[]>({
    queryKey: ["manual-quotes", symbols],
    queryFn: async () => {
      if (symbols.length === 0) return [];
      const res = await fetch(`/api/longbridge/quotes?symbols=${symbols.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
    enabled: symbols.length > 0,
    refetchInterval: 30_000,
  });

  const { data: staticInfo } = useQuery<Record<string, StaticInfoEntry>>({
    queryKey: ["static-info", symbols],
    queryFn: async () => {
      if (symbols.length === 0) return {};
      const res = await fetch(`/api/longbridge/static-info?symbols=${symbols.join(",")}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: symbols.length > 0,
    staleTime: 60_000 * 60,
  });

  const positions = useMemo<EnrichedPosition[]>(() => {
    if (!quotesData || holdings.length === 0) return [];

    const quoteMap = new Map(quotesData.map((q) => [q.symbol, q]));

    return holdings.map((h) => {
      const liveQuote = liveQuotes.get(h.symbol);
      const apiQuote = quoteMap.get(h.symbol);
      const info = staticInfo?.[h.symbol];
      const currentPrice = liveQuote?.lastDone ?? apiQuote?.lastDone ?? 0;
      const prevClose = liveQuote?.prevClose ?? apiQuote?.prevClose ?? 0;
      const currency = info?.currency ?? (h.symbol.endsWith(".HK") ? "HKD" : "USD");
      const marketValue = h.quantity * currentPrice;
      const dailyPL = h.quantity * (currentPrice - prevClose);
      const prevValue = h.quantity * prevClose;
      const dailyPLPercent = prevValue !== 0 ? (dailyPL / prevValue) * 100 : 0;

      return {
        symbol: h.symbol,
        symbolName: info?.name ?? h.symbol.split(".")[0],
        quantity: h.quantity,
        availableQuantity: h.quantity,
        costPrice: 0,
        currency,
        market: h.symbol.endsWith(".HK") ? "HK" : "US",
        currentPrice,
        prevClose,
        marketValue,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        dailyPL,
        dailyPLPercent,
      };
    });
  }, [holdings, quotesData, liveQuotes, staticInfo]);

  return positions;
}
