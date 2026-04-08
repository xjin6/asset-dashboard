"use client";

import { useQuery } from "@tanstack/react-query";
import type { AccountBalanceData } from "@/lib/longbridge/types";

export function useBalance() {
  return useQuery<AccountBalanceData[]>({
    queryKey: ["balance"],
    queryFn: async () => {
      const res = await fetch("/api/longbridge/balance");
      if (!res.ok) throw new Error("Failed to fetch balance");
      return res.json();
    },
    refetchInterval: 5_000, // Refresh every 5s to keep net assets in sync
  });
}
