"use client";

import { useState, useEffect } from "react";

export interface MarketSession {
  label: string;
  color: string; // tailwind color token
}

function computeSession(): MarketSession {
  const now = new Date();
  // Get current time in New York timezone (handles EST/EDT automatically)
  const nyStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const ny = new Date(nyStr);
  const day = ny.getDay(); // 0=Sun, 6=Sat
  const mins = ny.getHours() * 60 + ny.getMinutes();

  if (day === 0 || day === 6) return { label: "Closed", color: "gray" };

  if (mins >= 4 * 60 && mins < 9 * 60 + 30)  return { label: "Pre-Market", color: "blue" };
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return { label: "Regular", color: "green" };
  if (mins >= 16 * 60 && mins < 20 * 60)     return { label: "Post-Market", color: "orange" };
  return { label: "Overnight", color: "purple" };
}

export function useMarketSession(): MarketSession {
  const [session, setSession] = useState<MarketSession>(computeSession);

  useEffect(() => {
    // Update every 30 seconds to stay current
    const id = setInterval(() => setSession(computeSession()), 30_000);
    return () => clearInterval(id);
  }, []);

  return session;
}
