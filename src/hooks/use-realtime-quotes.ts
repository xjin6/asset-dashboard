"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { QuoteData } from "@/lib/longbridge/types";

export function useRealtimeQuotes(extraSymbols: string[] = []) {
  const [quotes, setQuotes] = useState<Map<string, QuoteData>>(new Map());
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const extraSymbolsKey = extraSymbols.sort().join(",");

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = extraSymbolsKey ? `?symbols=${extraSymbolsKey}` : "";
    const es = new EventSource(`/api/longbridge/stream${params}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "init") {
          const map = new Map<string, QuoteData>();
          for (const q of data.quotes) {
            map.set(q.symbol, q);
          }
          setQuotes(map);
        } else if (data.type === "quote") {
          setQuotes((prev) => {
            const next = new Map(prev);
            next.set(data.quote.symbol, data.quote);
            return next;
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 3000);
    };
  }, [extraSymbolsKey]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return { quotes, connected };
}
