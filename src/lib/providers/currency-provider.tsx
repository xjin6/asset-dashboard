"use client";

import { createContext, useContext } from "react";

export const DISPLAY_CURRENCY = "HKD";

interface CurrencyContextValue {
  displayCurrency: string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: DISPLAY_CURRENCY,
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyContext.Provider value={{ displayCurrency: DISPLAY_CURRENCY }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
