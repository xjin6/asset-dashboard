"use client";

import { useQuery } from "@tanstack/react-query";
import type { QuoteData } from "@/lib/longbridge/types";

export function useQuotes(symbols: string[]) {
  return useQuery<QuoteData[]>({
    queryKey: ["quotes", symbols],
    queryFn: async () => {
      const res = await fetch(
        `/api/longbridge/quotes?symbols=${symbols.join(",")}`
      );
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
    refetchInterval: 5_000,
    enabled: symbols.length > 0,
  });
}
