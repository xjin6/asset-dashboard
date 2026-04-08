import { getTradeContext } from "./client";
import type { AccountBalanceData, StockPositionData, CashFlowData } from "./types";

export async function fetchAccountBalance(
  currency?: string
): Promise<AccountBalanceData[]> {
  const ctx = await getTradeContext();
  const balances = await ctx.accountBalance(currency);

  return balances.map((b) => ({
    totalCash: b.totalCash.toNumber(),
    netAssets: b.netAssets.toNumber(),
    buyPower: b.buyPower.toNumber(),
    maxFinanceAmount: b.maxFinanceAmount.toNumber(),
    remainingFinanceAmount: b.remainingFinanceAmount.toNumber(),
    riskLevel: b.riskLevel,
    marginCall: b.marginCall.toNumber(),
    currency: b.currency,
    cashInfos: b.cashInfos.map((c) => ({
      withdrawCash: c.withdrawCash.toNumber(),
      availableCash: c.availableCash.toNumber(),
      frozenCash: c.frozenCash.toNumber(),
      settlingCash: c.settlingCash.toNumber(),
      currency: c.currency,
    })),
  }));
}

export async function fetchStockPositions(
  symbols?: string[]
): Promise<StockPositionData[]> {
  const ctx = await getTradeContext();
  const resp = await ctx.stockPositions(symbols);
  const positions: StockPositionData[] = [];

  for (const channel of resp.channels) {
    for (const pos of channel.positions) {
      positions.push({
        symbol: pos.symbol,
        symbolName: pos.symbolName,
        quantity: pos.quantity.toNumber(),
        availableQuantity: pos.availableQuantity.toNumber(),
        costPrice: pos.costPrice.toNumber(),
        currency: pos.currency,
        market: String(pos.market),
      });
    }
  }

  return positions;
}

export async function fetchCashFlow(
  startAt: Date,
  endAt: Date,
  businessType?: number,
  page?: number,
  size?: number
): Promise<CashFlowData[]> {
  const ctx = await getTradeContext();
  const flows = await ctx.cashFlow({
    startAt,
    endAt,
    businessType,
    page,
    size,
  });

  return flows.map((f) => ({
    transactionFlowName: f.transactionFlowName,
    direction: f.direction,
    businessType: f.businessType,
    balance: f.balance.toNumber(),
    currency: f.currency,
    businessTime: f.businessTime.toISOString(),
    symbol: f.symbol,
    description: f.description,
  }));
}
