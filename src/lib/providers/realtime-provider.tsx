"use client";

import { createContext, useContext, useMemo } from "react";
import { useRealtimeQuotes } from "@/hooks/use-realtime-quotes";
import { useManualPositions } from "@/lib/providers/manual-positions-provider";
import type { QuoteData } from "@/lib/longbridge/types";

interface RealtimeContextValue {
  quotes: Map<string, QuoteData>;
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  quotes: new Map(),
  connected: false,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { morgan, fidelity } = useManualPositions();

  // Collect all manual holding symbols to subscribe via SSE
  const extraSymbols = useMemo(() => {
    const symbols = [
      ...morgan.holdings.map((h) => h.symbol),
      ...fidelity.holdings.map((h) => h.symbol),
    ];
    return [...new Set(symbols)];
  }, [morgan.holdings, fidelity.holdings]);

  const value = useRealtimeQuotes(extraSymbols);
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
