"use client";

import { createContext, useContext } from "react";
import { useServerStorage } from "@/hooks/use-server-storage";

interface ManualHolding {
  symbol: string;
  quantity: number;
}

interface ManualBrokerageData {
  holdings: ManualHolding[];
  setHoldings: (holdings: ManualHolding[]) => void;
  addHolding: (symbol: string, quantity: number) => void;
  removeHolding: (symbol: string) => void;
  reorderHolding: (fromIndex: number, toIndex: number) => void;
}

interface ManualPositionsContextValue {
  morgan: ManualBrokerageData;
  fidelity: ManualBrokerageData;
}

function useManualHoldings(storageKey: string): ManualBrokerageData {
  const [holdings, setHoldings] = useServerStorage<ManualHolding[]>(storageKey, []);

  const addHolding = (symbol: string, quantity: number) => {
    const existing = holdings.find((h) => h.symbol === symbol);
    if (existing) {
      setHoldings(holdings.map((h) => (h.symbol === symbol ? { ...h, quantity } : h)));
    } else {
      setHoldings([...holdings, { symbol, quantity }]);
    }
  };

  const removeHolding = (symbol: string) => {
    setHoldings(holdings.filter((h) => h.symbol !== symbol));
  };

  const reorderHolding = (fromIndex: number, toIndex: number) => {
    const updated = [...holdings];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setHoldings(updated);
  };

  return { holdings, setHoldings, addHolding, removeHolding, reorderHolding };
}

const ManualPositionsContext = createContext<ManualPositionsContextValue>({
  morgan: { holdings: [], setHoldings: () => {}, addHolding: () => {}, removeHolding: () => {}, reorderHolding: () => {} },
  fidelity: { holdings: [], setHoldings: () => {}, addHolding: () => {}, removeHolding: () => {}, reorderHolding: () => {} },
});

export function ManualPositionsProvider({ children }: { children: React.ReactNode }) {
  const morgan = useManualHoldings("manual-holdings-morgan");
  const fidelity = useManualHoldings("manual-holdings-fidelity");
  return (
    <ManualPositionsContext.Provider value={{ morgan, fidelity }}>
      {children}
    </ManualPositionsContext.Provider>
  );
}

export function useManualPositions() {
  return useContext(ManualPositionsContext);
}
