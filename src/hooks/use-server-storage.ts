"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useServerStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [data, setData] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load from server on mount
  useEffect(() => {
    fetch(`/api/storage?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((serverData) => {
        if (serverData !== null) {
          setData(serverData);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [key]);

  // Save to server (debounced 500ms)
  const persist = useCallback(
    (value: T) => {
      setData(value);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        fetch("/api/storage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, data: value }),
        }).catch(console.error);
      }, 500);
    },
    [key]
  );

  return [data, persist];
}
