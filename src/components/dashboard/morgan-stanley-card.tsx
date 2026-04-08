"use client";

import { useManualPositions } from "@/lib/providers/manual-positions-provider";
import { ManualBrokerageCard } from "./manual-brokerage-card";
import { Building2 } from "lucide-react";

export function MorganStanleyCard() {
  const { morgan } = useManualPositions();
  return (
    <ManualBrokerageCard
      title="Morgan"
      icon={Building2}
      holdings={morgan.holdings}
      addHolding={morgan.addHolding}
      removeHolding={morgan.removeHolding}
      reorderHolding={morgan.reorderHolding}
      themeColor="#3b82f6"
    />
  );
}
