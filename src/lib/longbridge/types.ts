export interface AccountBalanceData {
  totalCash: number;
  netAssets: number;
  buyPower: number;
  maxFinanceAmount: number;
  remainingFinanceAmount: number;
  riskLevel: number;
  marginCall: number;
  currency: string;
  cashInfos: CashInfoData[];
}

export interface CashInfoData {
  withdrawCash: number;
  availableCash: number;
  frozenCash: number;
  settlingCash: number;
  currency: string;
}

export interface StockPositionData {
  symbol: string;
  symbolName: string;
  quantity: number;
  availableQuantity: number;
  costPrice: number;
  currency: string;
  market: string;
}

export interface EnrichedPosition extends StockPositionData {
  currentPrice: number;
  prevClose: number;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  dailyPL: number;
  dailyPLPercent: number;
}

export interface QuoteData {
  symbol: string;
  lastDone: number;       // best current price (pre-market if available, else regular)
  regularLastDone: number; // regular session close price (for fxRates calculation)
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  turnover: number;
  timestamp: string;
  changeAmount: number;
  changePercent: number;
}

export interface CashFlowData {
  transactionFlowName: string;
  direction: number;
  businessType: number;
  balance: number;
  currency: string;
  businessTime: string;
  symbol: string | null;
  description: string;
}
