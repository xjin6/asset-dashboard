"use client";

import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, formatNumber, cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EnrichedPosition } from "@/lib/longbridge/types";
import { useMarketSession } from "@/hooks/use-market-session";

// Stock logo: tries FMP CDN for US stocks, falls back to colored initials
function StockLogo({ symbol, name }: { symbol: string; name: string }) {
  const ticker = symbol.split(".")[0];
  const exchange = symbol.split(".")[1];
  const src = exchange === "US"
    ? `https://financialmodelingprep.com/image-stock/${ticker}.png`
    : `https://logo.clearbit.com/${ticker.toLowerCase()}.com`;

  return (
    <div className="relative mr-1.5 h-6 w-6 shrink-0">
      <img
        src={src}
        alt={name}
        className="h-6 w-6 rounded-full object-contain ring-1 ring-border"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fallback = el.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        className="absolute inset-0 hidden h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-1 ring-border"
        style={{ display: "none" }}
      >
        {ticker.slice(0, 2)}
      </div>
    </div>
  );
}

interface CashItem {
  label: string;
  amount: number;
  currency: string;
}

interface BrokerageCardProps {
  title: string;
  icon: LucideIcon;
  positions: EnrichedPosition[];
  statusLabel?: React.ReactNode;
  /** Total assets in base currency (FX-converted) */
  totalAssets?: number;
  /** Total market value in base currency (FX-converted) */
  totalMarketValue?: number;
  /** Total P&L in base currency (FX-converted) */
  totalPL?: number;
  totalPLPercent?: number;
  /** Total Daily P&L in base currency (FX-converted) */
  totalDailyPL?: number;
  totalDailyPLPercent?: number;
  totalAssetsCurrency?: string;
  cashItems?: CashItem[];
  /** Manual mode: no cost basis, P&L columns show "-" */
  manualMode?: boolean;
  /** Callback when rows are reordered via drag-and-drop */
  onReorder?: (fromIndex: number, toIndex: number) => void;
  /** Theme color for card background gradient */
  themeColor?: string;
}

export function BrokerageCard({
  title,
  icon: Icon,
  positions,
  statusLabel,
  totalAssets,
  totalMarketValue,
  totalPL,
  totalPLPercent,
  totalDailyPL,
  totalDailyPLPercent,
  totalAssetsCurrency = "HKD",
  cashItems,
  manualMode = false,
  onReorder,
  themeColor,
}: BrokerageCardProps) {
  const dragItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const session = useMarketSession();

  const sessionColors: Record<string, string> = {
    green:  "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    blue:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    gray:   "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };
  const sessionBadgeEl = (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sessionColors[session.color])}>
      {session.label}
    </span>
  );

  if (positions.length === 0) {
    return (
      <Card className="relative overflow-hidden">
        {themeColor && <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: `linear-gradient(135deg, ${themeColor}, transparent 60%)` }} />}
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5" />
              {title}
            </CardTitle>
            {sessionBadgeEl}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No positions found.</p>
        </CardContent>
      </Card>
    );
  }

  // Fallback: if no FX-converted values provided, sum raw (single-currency case)
  const rawMV = positions.reduce((s, p) => s + p.marketValue, 0);
  const rawPL = positions.reduce((s, p) => s + p.unrealizedPL, 0);
  const rawCost = positions.reduce((s, p) => s + p.quantity * p.costPrice, 0);
  const rawPLPercent = rawCost !== 0 ? (rawPL / rawCost) * 100 : 0;
  const rawDailyPL = positions.reduce((s, p) => s + p.dailyPL, 0);
  const rawPrevMV = positions.reduce((s, p) => s + p.quantity * p.prevClose, 0);
  const rawDailyPLPercent = rawPrevMV !== 0 ? (rawDailyPL / rawPrevMV) * 100 : 0;

  const displayMV = totalMarketValue ?? rawMV;
  const displayPL = totalPL ?? rawPL;
  const displayPLPercent = totalPLPercent ?? rawPLPercent;
  const displayDailyPL = totalDailyPL ?? rawDailyPL;
  const displayDailyPLPercent = totalDailyPLPercent ?? rawDailyPLPercent;
  const displayTotal = totalAssets ?? displayMV + (cashItems?.reduce((s, c) => s + c.amount, 0) ?? 0);

  return (
    <Card className="relative overflow-hidden">
      {themeColor && <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ background: `linear-gradient(135deg, ${themeColor}, transparent 60%)` }} />}
      <CardHeader className="relative pb-2">
        {/* Desktop: original single-row grid with badge in last column */}
        <div className="hidden md:grid items-center gap-y-1 text-sm" style={{ gridTemplateColumns: "9rem minmax(10rem,auto) minmax(10rem,auto) minmax(10rem,auto) minmax(10rem,auto) 1fr" }}>
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5" />
            {title}
            <Badge variant="secondary" className="ml-1">{positions.length}</Badge>
          </CardTitle>
          <span className="px-2 text-muted-foreground">Total Assets: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(displayTotal, totalAssetsCurrency)}</span></span>
          <span className="px-2 text-muted-foreground">MV: <span className="font-semibold tabular-nums text-foreground">{formatCurrency(displayMV, totalAssetsCurrency)}</span></span>
          <span className="px-2 text-muted-foreground">Daily: {manualMode ? <span className="font-medium text-muted-foreground">—</span> : <span className={cn("font-semibold tabular-nums", displayDailyPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{formatCurrency(displayDailyPL, totalAssetsCurrency)}<span className="ml-1 text-xs font-medium">({formatPercent(displayDailyPLPercent)})</span></span>}</span>
          <span className="px-2 text-muted-foreground">P&L: {manualMode ? <span className="font-medium text-muted-foreground">—</span> : <span className={cn("font-semibold tabular-nums", displayPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{formatCurrency(displayPL, totalAssetsCurrency)}<span className="ml-1 text-xs font-medium">({formatPercent(displayPLPercent)})</span></span>}</span>
          <span className="flex items-center justify-end gap-2">{statusLabel}{sessionBadgeEl}</span>
        </div>

        {/* Mobile: two-row stack with badge on first row */}
        <div className="text-sm md:hidden">
          <div className="flex items-center justify-between gap-x-3">
            <div className="flex items-center gap-x-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5" />
                {title}
                <Badge variant="secondary" className="ml-1">{positions.length}</Badge>
              </CardTitle>
              <span className="font-semibold tabular-nums">{formatCurrency(displayTotal, totalAssetsCurrency)}</span>
            </div>
            {sessionBadgeEl}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>MV: <span className="font-medium text-foreground">{formatCurrency(displayMV, totalAssetsCurrency)}</span></span>
            <span>Daily: {manualMode ? "—" : <span className={cn("font-medium", displayDailyPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{formatCurrency(displayDailyPL, totalAssetsCurrency)} ({formatPercent(displayDailyPLPercent)})</span>}</span>
            <span>P&L: {manualMode ? "—" : <span className={cn("font-medium", displayPL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>{formatCurrency(displayPL, totalAssetsCurrency)} ({formatPercent(displayPLPercent)})</span>}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table className="table-fixed tabular-nums">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">Name</TableHead>
                <TableHead className="w-[8%] text-right">Qty</TableHead>
                <TableHead className="w-[10%] text-right">Cost</TableHead>
                <TableHead className="w-[10%] text-right">Current</TableHead>
                <TableHead className="w-[16%] text-right">Market Value</TableHead>
                <TableHead className="w-[17%] text-right">Daily P&L</TableHead>
                <TableHead className="w-[17%] text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((pos, idx) => (
                <TableRow
                  key={pos.symbol}
                  draggable={!!onReorder}
                  onDragStart={() => { dragItem.current = idx; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={() => {
                    if (dragItem.current !== null && dragItem.current !== idx) {
                      onReorder?.(dragItem.current, idx);
                    }
                    dragItem.current = null;
                    setDragOverIndex(null);
                  }}
                  onDragEnd={() => { dragItem.current = null; setDragOverIndex(null); }}
                  className={cn(
                    onReorder && "cursor-grab active:cursor-grabbing",
                    dragOverIndex === idx && "border-t-2 border-primary"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {onReorder && (
                        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <StockLogo symbol={pos.symbol} name={pos.symbolName} />
                      <div>
                        <p className="truncate font-medium">{pos.symbolName}</p>
                        <p className="text-xs text-muted-foreground">
                          {pos.symbol}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(pos.quantity, 0)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {manualMode ? "—" : formatNumber(pos.costPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(pos.currentPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(pos.marketValue, pos.currency)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {manualMode ? "—" : (
                      <span
                        className={cn(
                          "font-medium",
                          pos.dailyPL >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {formatCurrency(pos.dailyPL, pos.currency)}
                        <span className="ml-1 text-xs">
                          ({formatPercent(pos.dailyPLPercent)})
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {manualMode ? "—" : (
                      <span
                        className={cn(
                          "font-medium",
                          pos.unrealizedPL >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {formatCurrency(pos.unrealizedPL, pos.currency)}
                        <span className="ml-1 text-xs">
                          ({formatPercent(pos.unrealizedPLPercent)})
                        </span>
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {positions.map((pos) => (
            <div key={pos.symbol} className="rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <StockLogo symbol={pos.symbol} name={pos.symbolName} />
                  <div>
                    <p className="font-medium">{pos.symbolName}</p>
                    <p className="text-xs text-muted-foreground">{pos.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrency(pos.marketValue, pos.currency)}
                  </p>
                  {!manualMode && (
                    <p
                      className={cn(
                        "text-xs",
                        pos.dailyPL >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}
                    >
                      Today: {formatCurrency(pos.dailyPL, pos.currency)} ({formatPercent(pos.dailyPLPercent)})
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>
                  <span>Qty: </span>
                  <span className="text-foreground">
                    {formatNumber(pos.quantity, 0)}
                  </span>
                </div>
                <div>
                  <span>Cost: </span>
                  <span className="text-foreground">
                    {manualMode ? "—" : formatNumber(pos.costPrice)}
                  </span>
                </div>
                <div>
                  <span>Now: </span>
                  <span className="text-foreground">
                    {formatNumber(pos.currentPrice)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cash section */}
        {cashItems && cashItems.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 sm:grid-cols-4 lg:grid-cols-6">
            {cashItems.map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/50 p-2">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">
                  {formatCurrency(item.amount, item.currency)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
