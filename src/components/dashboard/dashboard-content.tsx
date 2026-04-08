"use client";

import { RealtimeProvider } from "@/lib/providers/realtime-provider";
import { ManualPositionsProvider } from "@/lib/providers/manual-positions-provider";
import { SavingsProvider } from "@/lib/providers/savings-provider";
import { FxProvider } from "@/lib/providers/fx-provider";
import { AssetSummaryCard } from "./asset-summary-card";
import { PositionsTable } from "./positions-table";
import { MorganStanleyCard } from "./morgan-stanley-card";
import { FidelityCard } from "./fidelity-card";
import { SavingsCard } from "./savings-card";

export function DashboardContent() {
  return (
    <ManualPositionsProvider>
      <SavingsProvider>
        <FxProvider>
          <RealtimeProvider>
            <AssetSummaryCard />
            <PositionsTable />
            <MorganStanleyCard />
            <FidelityCard />
            <SavingsCard />
          </RealtimeProvider>
        </FxProvider>
      </SavingsProvider>
    </ManualPositionsProvider>
  );
}
