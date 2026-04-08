"use client";

import { useQuery } from "@tanstack/react-query";
import type { CashFlowData } from "@/lib/longbridge/types";

export function useCashFlow(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start", startDate);
  if (endDate) params.set("end", endDate);

  return useQuery<CashFlowData[]>({
    queryKey: ["cashflow", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/longbridge/cashflow?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cash flow");
      return res.json();
    },
  });
}
