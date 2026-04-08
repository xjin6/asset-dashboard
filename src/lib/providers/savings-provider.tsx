"use client";

import { createContext, useContext } from "react";
import { useServerStorage } from "@/hooks/use-server-storage";

export interface SavingsEntry {
  amount: number;
  currency: string;
}

export interface SavingsAccount {
  id: string;
  name: string;
  entries: SavingsEntry[];
}

interface SavingsContextValue {
  accounts: SavingsAccount[];
  addAccount: (name: string) => void;
  removeAccount: (id: string) => void;
  renameAccount: (id: string, name: string) => void;
  addEntry: (accountId: string, amount: number, currency: string) => void;
  removeEntry: (accountId: string, entryIndex: number) => void;
  updateEntry: (accountId: string, entryIndex: number, amount: number, currency: string) => void;
  reorderAccounts: (fromIndex: number, toIndex: number) => void;
}

const SavingsContext = createContext<SavingsContextValue>({
  accounts: [],
  addAccount: () => {},
  removeAccount: () => {},
  renameAccount: () => {},
  addEntry: () => {},
  removeEntry: () => {},
  updateEntry: () => {},
  reorderAccounts: () => {},
});

export function SavingsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useServerStorage<SavingsAccount[]>("savings-accounts", []);

  const addAccount = (name: string) => {
    setAccounts([...accounts, { id: Date.now().toString(), name, entries: [] }]);
  };

  const removeAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
  };

  const renameAccount = (id: string, name: string) => {
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, name } : a)));
  };

  const addEntry = (accountId: string, amount: number, currency: string) => {
    setAccounts(
      accounts.map((a) =>
        a.id === accountId
          ? { ...a, entries: [...a.entries, { amount, currency }] }
          : a
      )
    );
  };

  const removeEntry = (accountId: string, entryIndex: number) => {
    setAccounts(
      accounts.map((a) =>
        a.id === accountId
          ? { ...a, entries: a.entries.filter((_, i) => i !== entryIndex) }
          : a
      )
    );
  };

  const updateEntry = (accountId: string, entryIndex: number, amount: number, currency: string) => {
    setAccounts(
      accounts.map((a) =>
        a.id === accountId
          ? {
              ...a,
              entries: a.entries.map((e, i) =>
                i === entryIndex ? { amount, currency } : e
              ),
            }
          : a
      )
    );
  };

  const reorderAccounts = (fromIndex: number, toIndex: number) => {
    const updated = [...accounts];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setAccounts(updated);
  };

  return (
    <SavingsContext.Provider
      value={{ accounts, addAccount, removeAccount, renameAccount, addEntry, removeEntry, updateEntry, reorderAccounts }}
    >
      {children}
    </SavingsContext.Provider>
  );
}

export function useSavings() {
  return useContext(SavingsContext);
}
