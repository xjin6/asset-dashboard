"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useManualEnriched } from "@/hooks/use-manual-enriched";
import { useFxRates } from "@/lib/providers/fx-provider";
import { BrokerageCard } from "./brokerage-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Search, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ManualHolding {
  symbol: string;
  quantity: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  currency: string;
}

interface ManualBrokerageCardProps {
  title: string;
  icon: LucideIcon;
  holdings: ManualHolding[];
  addHolding: (symbol: string, quantity: number) => void;
  removeHolding: (symbol: string) => void;
  reorderHolding: (fromIndex: number, toIndex: number) => void;
  themeColor?: string;
}

export function ManualBrokerageCard({
  title,
  icon: Icon,
  holdings,
  addHolding,
  removeHolding,
  reorderHolding,
  themeColor,
}: ManualBrokerageCardProps) {
  const positions = useManualEnriched(holdings);
  const fxRates = useFxRates();

  // Compute HKD-converted summary for header
  const hkdSummary = useMemo(() => {
    let mvHKD = 0;
    for (const pos of positions) {
      const rate = fxRates[pos.currency] ?? 1;
      mvHKD += pos.marketValue * rate;
    }
    return { totalAssets: mvHKD, marketValue: mvHKD };
  }, [positions, fxRates]);

  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null);
  const [qtyInput, setQtyInput] = useState("");
  const [showManage, setShowManage] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/longbridge/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {}
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, doSearch]);

  const handleSelectSymbol = (result: SearchResult) => {
    setSelectedSymbol(result);
    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  const handleAdd = () => {
    if (!selectedSymbol) return;
    const qty = parseFloat(qtyInput);
    if (isNaN(qty) || qty <= 0) return;
    addHolding(selectedSymbol.symbol, qty);
    setSelectedSymbol(null);
    setQtyInput("");
  };

  const statusLabel = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-5 gap-1 px-1 text-xs text-muted-foreground"
        onClick={() => { setShowForm(!showForm); setShowManage(false); }}
      >
        <Plus className="h-3 w-3" />
      </Button>
      {holdings.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-xs text-muted-foreground"
          onClick={() => { setShowManage(!showManage); setShowForm(false); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  if (positions.length === 0 && !showForm) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3 w-3" />
              Add Holding
            </Button>
          </div>
        </CardHeader>
        {showForm && <CardContent>{renderForm()}</CardContent>}
        {!showForm && (
          <CardContent>
            <p className="text-sm text-muted-foreground">No positions configured.</p>
          </CardContent>
        )}
      </Card>
    );
  }

  function renderForm() {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        {!selectedSymbol ? (
          <div className="relative">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stock (e.g. AAPL, Tesla, 700)..."
                className="h-8 flex-1 rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => { setShowForm(false); setSearchQuery(""); setSearchResults([]); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Search results dropdown */}
            {(searchResults.length > 0 || searching) && (
              <div className="absolute left-0 right-0 top-10 z-10 rounded-md border bg-popover shadow-md">
                {searching && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                )}
                {searchResults.map((r) => (
                  <button
                    key={r.symbol}
                    className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => handleSelectSymbol(r)}
                  >
                    <div>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-muted-foreground">{r.symbol}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.currency}</span>
                  </button>
                ))}
                {!searching && searchResults.length === 0 && searchQuery.trim() && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No results found</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <p className="mb-1 text-xs text-muted-foreground">Selected</p>
              <div className="flex h-8 items-center gap-2 rounded-md border bg-background px-2 text-sm">
                <span className="font-medium">{selectedSymbol.name}</span>
                <span className="text-muted-foreground">{selectedSymbol.symbol}</span>
                <button
                  onClick={() => setSelectedSymbol(null)}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="w-24">
              <p className="mb-1 text-xs text-muted-foreground">Quantity</p>
              <input
                ref={qtyRef}
                type="number"
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                placeholder="100"
                className="h-8 w-full rounded-md border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleAdd}>
              Add
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <BrokerageCard
        title={title}
        icon={Icon}
        positions={positions}
        statusLabel={statusLabel}
        totalAssets={hkdSummary.totalAssets}
        totalMarketValue={hkdSummary.marketValue}
        totalAssetsCurrency="HKD"
        manualMode
        onReorder={reorderHolding}
        themeColor={themeColor}
      />

      {showForm && (
        <div className="-mt-1 px-6 pb-4">
          {renderForm()}
        </div>
      )}

      {showManage && (
        <div className="-mt-1 px-6 pb-4">
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Manage Holdings</p>
            {holdings.map((h) => (
              <div
                key={h.symbol}
                className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-accent"
              >
                <span className="text-sm">
                  {h.symbol} <span className="text-muted-foreground">× {h.quantity}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeHolding(h.symbol)}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
