"use client";

import { useState, useCallback } from "react";
import { usePositions } from "@/hooks/use-positions";
import { useRealtime } from "@/lib/providers/realtime-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw } from "lucide-react";

export function AiInsights() {
  const { data } = usePositions();
  const { quotes } = useRealtime();
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async () => {
    if (!data?.positions || data.positions.length === 0) return;
    setLoading(true);
    setError("");

    // Enrich positions with live prices
    const enriched = data.positions.map((pos) => {
      const live = quotes.get(pos.symbol);
      const currentPrice = live ? live.lastDone : pos.currentPrice;
      const prevClose = live ? live.prevClose : pos.prevClose;
      const marketValue = pos.quantity * currentPrice;
      const unrealizedPLPercent = pos.costPrice !== 0
        ? ((currentPrice - pos.costPrice) / pos.costPrice) * 100 : 0;
      const dailyPLPercent = prevClose !== 0
        ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
      return { ...pos, currentPrice, marketValue, unrealizedPLPercent, dailyPLPercent };
    });

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: enriched,
          balance: data.balance,
          totalAssets: data.balance
            ? data.balance.totalCash + enriched.reduce((s, p) => s + p.marketValue * (data.fxRates[p.currency] ?? 1), 0)
            : null,
          grandTotal: null, // simplified for now
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error === "ANTHROPIC_API_KEY not configured"
          ? "Add your Anthropic API key to .env.local to enable AI insights."
          : json.error);
      } else {
        setInsights(json.insights);
        setGenerated(true);
      }
    } catch {
      setError("Failed to connect to AI service.");
    } finally {
      setLoading(false);
    }
  }, [data, quotes]);

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50/40 via-indigo-50/20 to-transparent dark:from-violet-950/20 dark:via-indigo-950/10 dark:to-transparent" />
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Portfolio Insights
          </CardTitle>
          <Button
            variant={generated ? "outline" : "default"}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={generate}
            disabled={loading || !data?.positions?.length}
          >
            {loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {loading ? "Analyzing..." : generated ? "Refresh" : "Generate Insights"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
        {!loading && error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}
        {!loading && !error && insights && (
          <p className="text-sm leading-relaxed text-foreground">{insights}</p>
        )}
        {!loading && !error && !insights && (
          <p className="text-sm text-muted-foreground">
            Click &quot;Generate Insights&quot; to get an AI-powered analysis of your portfolio.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
