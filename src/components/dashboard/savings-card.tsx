"use client";

import { useState, useRef } from "react";
import { useSavings, type SavingsAccount } from "@/lib/providers/savings-provider";
import { useFxRates } from "@/lib/providers/fx-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { PiggyBank, Plus, Trash2, X, Pencil, Check, GripVertical } from "lucide-react";

const CURRENCIES = ["CNY", "HKD", "USD"];

// Map bank name keywords → known domain (same technique as stock logos but for banks)
const BANK_DOMAIN_MAP: [string, string][] = [
  ["hsbc", "hsbc.com"], ["hang seng", "hangseng.com"], ["恒生", "hangseng.com"],
  ["bank of china", "boc.cn"], ["中国银行", "boc.cn"],
  ["dbs", "dbs.com"], ["citibank", "citibank.com"], ["citi", "citibank.com"],
  ["jp morgan", "jpmorgan.com"], ["chase", "chase.com"],
  ["wells fargo", "wellsfargo.com"], ["bank of america", "bankofamerica.com"],
  ["ubs", "ubs.com"], ["standard chartered", "sc.com"],
  ["ocbc", "ocbc.com"], ["uob", "uob.com"],
  ["招商", "cmbchina.com"], ["cmb", "cmbchina.com"],
  ["工商", "icbc.com.cn"], ["icbc", "icbc.com.cn"],
  ["建设", "ccb.com"], ["ccb", "ccb.com"],
  ["农业", "abchina.com"], ["交通", "bankcomm.com"],
  ["浦发", "spdb.com.cn"], ["兴业", "cib.com.cn"],
  ["平安", "pingan.com"], ["中信", "citicbank.com"],
  ["光大", "cebbank.com"], ["民生", "cmbc.com.cn"],
  ["华夏", "hxb.com.cn"], ["广发", "cgbchina.com"],
];

// Google Favicon service — works for any domain, returns a real icon at 64px
function getBankLogoUrl(name: string): string {
  const n = name.toLowerCase();
  for (const [key, domain] of BANK_DOMAIN_MAP) {
    if (n.includes(key)) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
  }
  // Last resort: try treating the name itself as a search term via Google favicon
  // Replace spaces and use as domain guess
  const guess = n.replace(/[^a-z]/g, "") + ".com";
  return `https://www.google.com/s2/favicons?domain=${guess}&sz=64`;
}

function BankLogo({ name }: { name: string }) {
  const src = getBankLogoUrl(name);
  const initials = name.trim().slice(0, 2).toUpperCase();

  return (
    <div className="relative mr-1.5 h-6 w-6 shrink-0">
      <img
        src={src}
        alt={name}
        className="h-6 w-6 rounded-full object-cover ring-1 ring-border bg-white p-0.5"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fb = el.nextElementSibling as HTMLElement;
          if (fb) fb.style.display = "flex";
        }}
      />
      <div
        className="absolute inset-0 hidden h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-1 ring-border"
        style={{ display: "none" }}
      >
        {initials}
      </div>
    </div>
  );
}

function accountTotalHKD(account: SavingsAccount, fxRates: Record<string, number>): number {
  return account.entries.reduce((sum, e) => sum + e.amount * (fxRates[e.currency] ?? 1), 0);
}

export function SavingsCard() {
  const { accounts, addAccount, removeAccount, renameAccount, addEntry, removeEntry, updateEntry, reorderAccounts } = useSavings();
  const fxRates = useFxRates();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const dragItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [addingEntryId, setAddingEntryId] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryCurrency, setEntryCurrency] = useState("CNY");

  const grandTotal = accounts.reduce((sum, a) => sum + accountTotalHKD(a, fxRates), 0);

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    addAccount(newAccountName.trim());
    setNewAccountName("");
    setShowAddAccount(false);
  };

  const handleAddEntry = (accountId: string) => {
    const amt = parseFloat(entryAmount);
    if (isNaN(amt) || amt <= 0) return;
    addEntry(accountId, amt, entryCurrency);
    setEntryAmount("");
    setAddingEntryId(null);
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: "linear-gradient(135deg, #f97316, transparent 60%)" }} />
      <CardHeader className="relative pb-2">
        <div className="grid items-center gap-y-1 text-sm" style={{ gridTemplateColumns: "9rem minmax(10rem,auto) auto" }}>
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-5 w-5" />
            Savings
            <Badge variant="secondary" className="ml-1">
              {accounts.length}
            </Badge>
          </CardTitle>
          <span className="px-2 text-muted-foreground">
            Total Assets:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(grandTotal, "HKD")}
            </span>
          </span>
          <span className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={() => setShowAddAccount(true)}
            >
              <Plus className="h-3 w-3" />
              Add Card
            </Button>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add account form */}
        {showAddAccount && (
          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Bank card name (e.g. HSBC HK)"
              className="h-8 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
            />
            <Button size="sm" className="h-8" onClick={handleAddAccount}>Add</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setShowAddAccount(false); setNewAccountName(""); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {accounts.length === 0 && !showAddAccount && (
          <p className="text-sm text-muted-foreground">No savings accounts configured.</p>
        )}

        {/* Account list */}
        <div className="space-y-3">
          {accounts.map((account, idx) => {
            const acctTotal = accountTotalHKD(account, fxRates);
            return (
              <div
                key={account.id}
                className={cn(
                  "cursor-grab rounded-lg border p-3 active:cursor-grabbing",
                  dragOverIndex === idx && "border-t-2 border-primary"
                )}
                draggable
                onDragStart={() => { dragItem.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={() => {
                  if (dragItem.current !== null && dragItem.current !== idx) {
                    reorderAccounts(dragItem.current, idx);
                  }
                  dragItem.current = null;
                  setDragOverIndex(null);
                }}
                onDragEnd={() => { dragItem.current = null; setDragOverIndex(null); }}
              >
                {/* Account header */}
                <div className="mb-2 flex items-center justify-between">
                  {editingId === account.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-6 w-40 rounded border bg-background px-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameAccount(account.id, editName); setEditingId(null); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => { renameAccount(account.id, editName); setEditingId(null); }}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      <BankLogo name={account.name} />
                      <span className="text-sm font-semibold">{account.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatCurrency(acctTotal, "HKD")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1 text-muted-foreground"
                        onClick={() => { setEditingId(account.id); setEditName(account.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-muted-foreground"
                      onClick={() => setAddingEntryId(addingEntryId === account.id ? null : account.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-destructive"
                      onClick={() => removeAccount(account.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Entries — indented as level-2 items */}
                {account.entries.length > 0 && (
                  <div className="mt-1 space-y-1 pl-[62px]">
                    {account.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded bg-muted/40 px-2 py-1 text-sm">
                        <span className="tabular-nums text-muted-foreground">{formatCurrency(entry.amount, entry.currency)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs tabular-nums text-foreground/70">
                            ≈ {formatCurrency(entry.amount * (fxRates[entry.currency] ?? 1), "HKD")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1 text-muted-foreground hover:text-destructive"
                            onClick={() => removeEntry(account.id, idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add entry form */}
                {addingEntryId === account.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={entryCurrency}
                      onChange={(e) => setEntryCurrency(e.target.value)}
                      className="h-7 rounded-md border bg-background px-1.5 text-xs outline-none"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      placeholder="Amount"
                      className="h-7 w-28 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAddEntry(account.id)}
                    />
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAddEntry(account.id)}>Add</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-1" onClick={() => setAddingEntryId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
