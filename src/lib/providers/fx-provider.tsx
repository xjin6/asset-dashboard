"use client";

import { createContext, useContext } from "react";
import { usePositions } from "@/hooks/use-positions";

interface FxContextValue {
  fxRates: Record<string, number>;
}

const FxContext = createContext<FxContextValue>({ fxRates: { HKD: 1 } });

export function FxProvider({ children }: { children: React.ReactNode }) {
  const { data } = usePositions();
  const fxRates = data?.fxRates ?? { HKD: 1 };
  return (
    <FxContext.Provider value={{ fxRates }}>
      {children}
    </FxContext.Provider>
  );
}

export function useFxRates() {
  return useContext(FxContext).fxRates;
}
