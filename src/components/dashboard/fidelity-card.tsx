"use client";

import { useManualPositions } from "@/lib/providers/manual-positions-provider";
import { ManualBrokerageCard } from "./manual-brokerage-card";
import { Landmark } from "lucide-react";

export function FidelityCard() {
  const { fidelity } = useManualPositions();
  return (
    <ManualBrokerageCard
      title="Fidelity"
      icon={Landmark}
      holdings={fidelity.holdings}
      addHolding={fidelity.addHolding}
      removeHolding={fidelity.removeHolding}
      reorderHolding={fidelity.reorderHolding}
      themeColor="#22c55e"
    />
  );
}
