"use client";

import { useQuery } from "@tanstack/react-query";
import type { EnrichedPosition, AccountBalanceData } from "@/lib/longbridge/types";

export interface PositionsData {
  positions: EnrichedPosition[];
  balance?: AccountBalanceData;
  fxRates: Record<string, number>;
}

export function usePositions() {
  return useQuery<PositionsData>({
    queryKey: ["positions"],
    queryFn: async () => {
      const res = await fetch("/api/longbridge/positions");
      if (!res.ok) throw new Error("Failed to fetch positions");
      const data = await res.json();
      if (Array.isArray(data)) {
        return { positions: data, fxRates: { HKD: 1 } };
      }
      return data;
    },
    refetchInterval: 10_000,
  });
}
