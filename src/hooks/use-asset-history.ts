"use client";

import { useState, useEffect, useCallback } from "react";

interface DataPoint {
  time: number;
  value: number;
}

export type TimeRange = "1m" | "1h" | "1d" | "1w" | "1M";

const RANGE_MS: Record<TimeRange, number> = {
  "1m": 60 * 60 * 1000,
  "1h": 24 * 60 * 60 * 1000,
  "1d": 7 * 24 * 60 * 60 * 1000,
  "1w": 30 * 24 * 60 * 60 * 1000,
  "1M": 90 * 24 * 60 * 60 * 1000,
};

const RANGE_LABELS: Record<TimeRange, string> = {
  "1m": "1H",
  "1h": "24H",
  "1d": "7D",
  "1w": "30D",
  "1M": "90D",
};

export { RANGE_LABELS };

// Read-only — history is written exclusively by the background recorder (server-side).
// Polls every 60s to pick up new data points without requiring a page refresh.
export function useAssetHistory(_currentTotal?: number) {
  const [history, setHistory] = useState<DataPoint[]>([]);

  const fetchHistory = useCallback(() => {
    fetch("/api/storage?key=asset-history")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHistory(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchHistory();
    const id = setInterval(fetchHistory, 60_000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  const getFilteredData = useCallback(
    (range: TimeRange): DataPoint[] => {
      const cutoff = Date.now() - RANGE_MS[range];
      return history.filter((p) => p.time >= cutoff);
    },
    [history]
  );

  const resetHistory = useCallback(() => {
    fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "asset-history", data: [] }),
    }).then(() => setHistory([])).catch(console.error);
  }, []);

  return { history, getFilteredData, resetHistory };
}
