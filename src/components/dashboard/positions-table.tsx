"use client";

import { useMemo, useCallback } from "react";
import { usePositions } from "@/hooks/use-positions";
import { useServerStorage } from "@/hooks/use-server-storage";
import { useRealtime } from "@/lib/providers/realtime-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrokerageCard } from "./brokerage-card";
import { BarChart3 } from "lucide-react";
import type { EnrichedPosition } from "@/lib/longbridge/types";

export function PositionsTable() {
  const { data, isLoading, error } = usePositions();
  const { quotes, connected } = useRealtime();

  const positions = data?.positions;
  const balance = data?.balance;
  const fxRates = data?.fxRates ?? {};

  const livePositions = useMemo<EnrichedPosition[]>(() => {
    if (!positions) return [];
    return positions.map((pos) => {
      const liveQuote = quotes.get(pos.symbol);
      if (!liveQuote) return pos;

      const currentPrice = liveQuote.lastDone;
      const prevClose = liveQuote.prevClose;
      const marketValue = pos.quantity * currentPrice;
      const costValue = pos.quantity * pos.costPrice;
      const unrealizedPL = marketValue - costValue;
      const unrealizedPLPercent =
        costValue !== 0 ? (unrealizedPL / costValue) * 100 : 0;
      const dailyPL = pos.quantity * (currentPrice - prevClose);
      const prevValue = pos.quantity * prevClose;
      const dailyPLPercent = prevValue !== 0 ? (dailyPL / prevValue) * 100 : 0;

      return {
        ...pos,
        currentPrice,
        prevClose,
        marketValue,
        unrealizedPL,
        unrealizedPLPercent,
        dailyPL,
        dailyPLPercent,
      };
    });
  }, [positions, quotes]);

  // Display order for Longbridge positions (persisted on server)
  const [displayOrder, setDisplayOrder] = useServerStorage<string[]>("lb-position-order", []);

  const orderedPositions = useMemo(() => {
    if (displayOrder.length === 0) return livePositions;
    const orderMap = new Map(displayOrder.map((s, i) => [s, i]));
    return [...livePositions].sort((a, b) => {
      const ai = orderMap.get(a.symbol) ?? 999;
      const bi = orderMap.get(b.symbol) ?? 999;
      return ai - bi;
    });
  }, [livePositions, displayOrder]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    const symbols = orderedPositions.map((p) => p.symbol);
    const [moved] = symbols.splice(fromIndex, 1);
    symbols.splice(toIndex, 0, moved);
    setDisplayOrder(symbols);
  }, [orderedPositions]);

  const cashItems = balance
    ? balance.cashInfos.map((c) => ({
        label: `Cash (${c.currency})`,
        amount: c.availableCash,
        currency: c.currency,
      }))
    : undefined;

  // Use server-provided per-currency fxRates to convert live values to base currency
  const summary = useMemo(() => {
    if (!balance || !positions) {
      return {
        totalAssets: undefined as number | undefined,
        marketValue: undefined as number | undefined,
        pl: undefined as number | undefined,
        plPercent: undefined as number | undefined,
        dailyPL: undefined as number | undefined,
        dailyPLPercent: undefined as number | undefined,
      };
    }

    let mvBase = 0;
    let plBase = 0;
    let costBase = 0;
    let dailyPLBase = 0;
    let prevMVBase = 0;
    for (const pos of livePositions) {
      const rate = fxRates[pos.currency] ?? 1;
      mvBase += pos.marketValue * rate;
      plBase += pos.unrealizedPL * rate;
      costBase += pos.quantity * pos.costPrice * rate;
      dailyPLBase += pos.dailyPL * rate;
      prevMVBase += pos.quantity * pos.prevClose * rate;
    }
    const plPctBase = costBase !== 0 ? (plBase / costBase) * 100 : 0;
    const dailyPLPctBase = prevMVBase !== 0 ? (dailyPLBase / prevMVBase) * 100 : 0;

    return {
      totalAssets: balance.totalCash + mvBase,
      marketValue: mvBase,
      pl: plBase,
      plPercent: plPctBase,
      dailyPL: dailyPLBase,
      dailyPLPercent: dailyPLPctBase,
    };
  }, [balance, positions, livePositions, fxRates]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Longbridge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Longbridge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load positions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <BrokerageCard
      title="Longbridge"
      icon={BarChart3}
      positions={orderedPositions}
      totalAssets={summary.totalAssets}
      totalMarketValue={summary.marketValue}
      totalPL={summary.pl}
      totalPLPercent={summary.plPercent}
      totalDailyPL={summary.dailyPL}
      totalDailyPLPercent={summary.dailyPLPercent}
      totalAssetsCurrency={balance?.currency}
      cashItems={cashItems}
      onReorder={handleReorder}
      themeColor="#eab308"
    />
  );
}
