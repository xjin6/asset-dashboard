"use client";

import React, { useMemo, useState, useCallback } from "react";
import { usePositions } from "@/hooks/use-positions";
import { useManualEnriched } from "@/hooks/use-manual-enriched";
import { useRealtime } from "@/lib/providers/realtime-provider";
import { useManualPositions } from "@/lib/providers/manual-positions-provider";
import { useSavings } from "@/lib/providers/savings-provider";
import { useFxRates } from "@/lib/providers/fx-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wallet, Wifi, WifiOff, Sparkles, RefreshCw, Send, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAssetHistory, RANGE_LABELS, type TimeRange } from "@/hooks/use-asset-history";

const COLORS: Record<string, string> = {
  Longbridge: "#eab308", // yellow
  Morgan: "#3b82f6",     // blue
  Fidelity: "#22c55e",   // green
  Savings: "#f97316",    // orange
};

export function AssetSummaryCard() {
  const { data, isLoading } = usePositions();
  const { quotes, connected } = useRealtime();
  const { morgan, fidelity } = useManualPositions();
  const { accounts: savingsAccounts } = useSavings();
  const fxRates = useFxRates();

  const morganPositions = useManualEnriched(morgan.holdings);
  const fidelityPositions = useManualEnriched(fidelity.holdings);

  const positions = data?.positions;
  const balance = data?.balance;
  const apiFxRates = data?.fxRates ?? {};

  // Longbridge breakdown
  const longbridge = useMemo(() => {
    if (!positions || !balance) return { total: 0, cash: 0, stocks: 0, breakdown: [] as { name: string; value: number }[] };
    let mvBase = 0;
    const breakdown: { name: string; value: number }[] = [];
    for (const pos of positions) {
      const liveQuote = quotes.get(pos.symbol);
      const livePrice = liveQuote ? liveQuote.lastDone : pos.currentPrice;
      const rate = apiFxRates[pos.currency] ?? 1;
      const val = pos.quantity * livePrice * rate;
      mvBase += val;
      breakdown.push({ name: pos.symbolName, value: val });
    }
    const cash = balance.totalCash;
    if (cash > 0) breakdown.push({ name: "Cash", value: cash });
    return { total: cash + mvBase, cash, stocks: mvBase, breakdown };
  }, [positions, balance, quotes, apiFxRates]);

  // Morgan breakdown
  const morganData = useMemo(() => {
    let total = 0;
    const breakdown: { name: string; value: number }[] = [];
    for (const pos of morganPositions) {
      const rate = fxRates[pos.currency] ?? 1;
      const val = pos.marketValue * rate;
      total += val;
      breakdown.push({ name: pos.symbolName, value: val });
    }
    return { total, breakdown };
  }, [morganPositions, fxRates]);

  // Fidelity breakdown
  const fidelityData = useMemo(() => {
    let total = 0;
    const breakdown: { name: string; value: number }[] = [];
    for (const pos of fidelityPositions) {
      const rate = fxRates[pos.currency] ?? 1;
      const val = pos.marketValue * rate;
      total += val;
      breakdown.push({ name: pos.symbolName, value: val });
    }
    return { total, breakdown };
  }, [fidelityPositions, fxRates]);

  // Savings total (HKD)
  const savingsData = useMemo(() => {
    let total = 0;
    const breakdown: { name: string; value: number }[] = [];
    for (const acct of savingsAccounts) {
      let acctTotal = 0;
      for (const e of acct.entries) {
        acctTotal += e.amount * (fxRates[e.currency] ?? 1);
      }
      if (acctTotal > 0) {
        total += acctTotal;
        breakdown.push({ name: acct.name, value: acctTotal });
      }
    }
    return { total, breakdown };
  }, [savingsAccounts, fxRates]);

  const grandTotal = longbridge.total + morganData.total + fidelityData.total + savingsData.total;

  // Only record history when fxRates are loaded (USD key exists), to avoid recording unconverted values
  const fxReady = "USD" in apiFxRates;
  const { getFilteredData, resetHistory } = useAssetHistory(fxReady ? grandTotal : 0);
  const [timeRange, setTimeRange] = useState<TimeRange>("1m");
  const chartData = useMemo(() => getFilteredData(timeRange), [getFilteredData, timeRange]);

  const pieData = useMemo(() => {
    const slices: { name: string; value: number; breakdown: { name: string; value: number }[] }[] = [];
    if (longbridge.total > 0) slices.push({ name: "Longbridge", value: longbridge.total, breakdown: longbridge.breakdown });
    if (morganData.total > 0) slices.push({ name: "Morgan", value: morganData.total, breakdown: morganData.breakdown });
    if (fidelityData.total > 0) slices.push({ name: "Fidelity", value: fidelityData.total, breakdown: fidelityData.breakdown });
    if (savingsData.total > 0) slices.push({ name: "Savings", value: savingsData.total, breakdown: savingsData.breakdown });
    return slices;
  }, [longbridge, morganData, fidelityData, savingsData]);

  // Display currency for this card only (all internal values are in HKD, convert for display)
  const DISPLAY_CURRENCIES = ["HKD", "USD", "CNY"] as const;
  const [displayCur, setDisplayCur] = useState<string>("HKD");
  // Convert HKD amount to display currency
  const toDisplay = useCallback(
    (hkdAmount: number) => {
      if (displayCur === "HKD") return hkdAmount;
      const rate = fxRates[displayCur] ?? apiFxRates[displayCur] ?? 1;
      return rate !== 0 ? hkdAmount / rate : hkdAmount;
    },
    [displayCur, fxRates, apiFxRates]
  );

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const [expandedIndex, setExpandedIndex] = useState<number | undefined>(undefined);
  const onPieEnter = useCallback((_: unknown, index: number) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(undefined), []);

  // AI chat state
  interface ChatMsg { role: "user" | "assistant"; content: string }
  const [aiInsights, setAiInsights] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const buildPayload = useCallback(() => ({
    positions: (positions ?? []).map((p) => {
      const live = quotes.get(p.symbol);
      const livePrice = live ? live.lastDone : p.currentPrice;
      const prevClose = live ? live.prevClose : p.prevClose;
      const unrealizedPLPercent = p.costPrice !== 0 ? ((livePrice - p.costPrice) / p.costPrice) * 100 : 0;
      const dailyPLPercent = prevClose !== 0 ? ((livePrice - prevClose) / prevClose) * 100 : 0;
      const marketValue = p.quantity * livePrice;
      return { ...p, currentPrice: livePrice, unrealizedPLPercent, dailyPLPercent, marketValue };
    }),
    balance,
    totalAssets: balance
      ? balance.totalCash + (positions ?? []).reduce((s, p) => {
          const live = quotes.get(p.symbol);
          return s + p.quantity * (live ? live.lastDone : p.currentPrice) * (apiFxRates[p.currency] ?? 1);
        }, 0)
      : null,
    grandTotal,
    morganPositions: morganPositions,
    fidelityPositions: fidelityPositions,
    savingsAccounts: savingsAccounts.map((a) => ({ name: a.name, entries: a.entries })),
    fxRates: apiFxRates,
  }), [positions, balance, quotes, apiFxRates, grandTotal, morganPositions, fidelityPositions, savingsAccounts]);

  const generateInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "insights", ...buildPayload() }),
      });
      const data = await res.json();
      if (data.reply) {
        setAiInsights(data.reply);
        setChatHistory([{ role: "assistant", content: data.reply }]);
      } else if (data.error) setAiInsights(data.error);
    } catch { setAiInsights("Failed to connect to AI."); }
    finally { setAiLoading(false); }
  }, [buildPayload]);

  const sendChat = useCallback(async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          chatHistory: newHistory.slice(0, -1),
          userMessage: userMsg.content,
          ...buildPayload(),
        }),
      });
      const data = await res.json();
      if (data.reply) setChatHistory([...newHistory, { role: "assistant", content: data.reply }]);
    } catch { /* ignore */ }
    finally { setChatLoading(false); }
  }, [chatInput, chatHistory, buildPayload]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-10 w-48" />
          <Skeleton className="mx-auto h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-purple-50/20 to-amber-50/30 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-amber-950/15" />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            Account Summary
            {connected ? (
              <span className="flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400">
                <Wifi className="h-3 w-3" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <WifiOff className="h-3 w-3" />
              </span>
            )}
          </CardTitle>
          <div className="flex gap-1">
            {DISPLAY_CURRENCIES.map((c) => (
              <Button
                key={c}
                variant={displayCur === c ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setDisplayCur(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative py-2">
        {/* Desktop: 4-col grid. Mobile: single column */}
        <div className="grid grid-cols-1 items-center gap-y-4 md:gap-y-0 md:[grid-template-columns:2fr_1fr_1fr_1fr]">
          {/* D: Line chart — total assets over time (leftmost) */}
          <div className="flex flex-col gap-1 px-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">History</p>
                <button
                  onClick={() => { if (confirm("Clear all history data?")) resetHistory(); }}
                  className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-0.5">
                {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
                  <Button
                    key={r}
                    variant={timeRange === r ? "default" : "ghost"}
                    size="sm"
                    className="h-5 px-1.5 text-[10px]"
                    onClick={() => setTimeRange(r)}
                  >
                    {RANGE_LABELS[r]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-48">
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="time"
                      type="number"
                      scale="time"
                      domain={(() => {
                        const now = Date.now();
                        if (timeRange === "1h") {
                          // Fixed: today 00:00 → 24:00
                          const start = new Date(); start.setHours(0,0,0,0);
                          const end = new Date(); end.setHours(23,59,59,999);
                          return [start.getTime(), end.getTime()];
                        }
                        // 1m, 1d, 1w, 1M: dynamic [now-range, now]
                        const ms: Record<string, number> = { "1m": 3600000, "1d": 86400000*7, "1w": 86400000*30, "1M": 86400000*90 };
                        return [now - (ms[timeRange] ?? 3600000), now];
                      })()}
                      ticks={(() => {
                        const now = Date.now();
                        const result: number[] = [];
                        if (timeRange === "1m") {
                          // 1H view: tick every 5 minutes
                          const start = now - 3600000;
                          const first = Math.ceil(start / 300000) * 300000;
                          for (let t = first; t <= now; t += 300000) result.push(t);
                        } else if (timeRange === "1h") {
                          // 24H view: today 00:00–24:00, tick every 2 hours
                          const day = new Date(); day.setHours(0,0,0,0);
                          for (let h = 0; h <= 24; h += 2) result.push(day.getTime() + h * 3600000);
                        } else {
                          // 7D/30D/90D: daily ticks
                          const days: Record<string, number> = { "1d": 7, "1w": 30, "1M": 90 };
                          const n = days[timeRange] ?? 7;
                          const day = new Date(); day.setHours(0,0,0,0);
                          for (let i = n; i >= 0; i--) result.push(day.getTime() - i * 86400000);
                        }
                        return result;
                      })()}
                      tickFormatter={(t: number) => {
                        const d = new Date(t);
                        if (timeRange === "1m") return d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
                        if (timeRange === "1h") return `${d.getHours()}:00`;
                        return d.toLocaleDateString("en", { month: "short", day: "numeric" });
                      }}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      domain={(() => {
                        const vals = chartData.map(d => d.value);
                        if (vals.length === 0) return ["auto", "auto"] as const;
                        const mid = (Math.min(...vals) + Math.max(...vals)) / 2;
                        const range = Math.max(Math.max(...vals) - Math.min(...vals), mid * 0.02);
                        const pad = range * 0.5;
                        return [Math.floor(mid - pad), Math.ceil(mid + pad)] as [number, number];
                      })()}
                      tickFormatter={(v: number) => `${(toDisplay(v) / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                      labelFormatter={(t) => new Date(Number(t)).toLocaleString("en", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                      formatter={(v) => [formatCurrency(toDisplay(Number(v)), displayCur), "Total"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-muted-foreground">
                    Collecting data... ({chartData.length}/2 points)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* A: Pie chart */}
          <div className="relative -my-4 mx-auto h-52 w-52">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={600}
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={(_, index) =>
                      setExpandedIndex(expandedIndex === index ? undefined : index)
                    }
                    className="cursor-pointer"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={COLORS[entry.name] ?? "#94a3b8"}
                        style={{
                          transition: "opacity 200ms, filter 200ms",
                          opacity: activeIndex === undefined || activeIndex === index ? 1 : 0.3,
                          filter: activeIndex === index ? "brightness(1.15)" : "none",
                        }}
                        stroke={expandedIndex === index ? COLORS[entry.name] : "transparent"}
                        strokeWidth={expandedIndex === index ? 3 : 0}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">No data</p>
              </div>
            )}
          </div>

          {/* B: Total + Legend */}
          <div className="flex flex-col justify-center gap-2 px-2">
            <div className="mb-1">
              <p className="text-xs text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold tabular-nums tracking-tight">
                {formatCurrency(toDisplay(grandTotal), displayCur)}
              </p>
            </div>
            {pieData.map((entry, index) => {
              const pct = grandTotal > 0 ? (entry.value / grandTotal) * 100 : 0;
              const isExpanded = expandedIndex === index;
              const color = COLORS[entry.name] ?? "#94a3b8";
              return (
                <div
                  key={entry.name}
                  className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-all ${isExpanded ? "bg-muted" : "bg-muted/50 hover:bg-muted"}`}
                  style={isExpanded ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(undefined)}
                  onClick={() => setExpandedIndex(isExpanded ? undefined : index)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <span className="ml-3 font-semibold tabular-nums">
                    {formatCurrency(toDisplay(entry.value), displayCur)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums">
                      {pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* C: Expanded detail */}
          <div className="flex items-center justify-center px-2">
            {expandedIndex !== undefined && pieData[expandedIndex] && (() => {
              const expanded = pieData[expandedIndex];
              const color = COLORS[expanded.name] ?? "#94a3b8";
              return (
                <div
                  className="w-full rounded-lg border-l-2 bg-muted/30 px-4 py-3"
                  style={{ borderColor: color }}
                >
                  <p className="mb-2 text-xs font-semibold" style={{ color }}>
                    {expanded.name} Breakdown
                  </p>
                  <div className="space-y-1.5">
                    {expanded.breakdown.map((item) => {
                      const itemPct = expanded.value > 0
                        ? (item.value / expanded.value) * 100 : 0;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate text-muted-foreground">{item.name}</span>
                          <span className="ml-3 shrink-0 tabular-nums">
                            {formatCurrency(toDisplay(item.value), displayCur)}
                            <span className="ml-1 text-xs text-muted-foreground">
                              {itemPct.toFixed(1)}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* AI Insights + Chat */}
        <Separator className="my-4 opacity-50" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
              AI Insights
            </span>
            <button
              onClick={generateInsights}
              disabled={aiLoading}
              className="flex h-6 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-white shadow-md transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 40%, #818cf8 70%, #6d28d9 100%)" }}
            >
              {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {aiLoading ? "Analyzing..." : aiInsights ? "Refresh" : "Generate"}
            </button>
          </div>

          {/* Chat messages — resizable by dragging bottom edge */}
          {chatHistory.length > 0 && (
            <div className="resize-y overflow-auto rounded-lg bg-muted/20 p-3" style={{ minHeight: "8rem", maxHeight: "70vh" }}>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white dark:bg-violet-500"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <MarkdownText text={msg.content} />
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking...</div>
                </div>
              )}
            </div>
          )}

          {!aiInsights && !aiLoading && (
            <p className="text-xs text-muted-foreground">
              Click Generate for an AI analysis covering your full portfolio (Longbridge, Morgan, Fidelity, Savings).
            </p>
          )}

          {/* Chat input */}
          {aiInsights && (
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !chatLoading && sendChat()}
                placeholder="Ask about your portfolio..."
                className="h-8 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-violet-400"
                disabled={chatLoading}
              />
              <Button
                size="sm"
                className="h-8 w-8 bg-violet-600 p-0 hover:bg-violet-700"
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MarkdownText({ text }: { text: string }) {
  // Parse basic markdown: **bold**, *italic*, numbered lists, line breaks
  const lines = text.split("\n");
  return (
    <span className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        // Render inline bold/italic
        const rendered = renderInline(line);
        return <span key={i} className="block">{rendered}</span>;
      })}
    </span>
  );
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** and *italic* patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
