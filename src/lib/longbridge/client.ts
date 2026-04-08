import { Config, TradeContext, QuoteContext } from "longport";

const globalForLongbridge = globalThis as typeof globalThis & {
  _tradeCtx?: Promise<TradeContext>;
  _quoteCtx?: Promise<QuoteContext>;
  _lbConfig?: Config;
};

function getConfig(): Config {
  if (!globalForLongbridge._lbConfig) {
    globalForLongbridge._lbConfig = Config.fromEnv();
  }
  return globalForLongbridge._lbConfig;
}

export async function getTradeContext(): Promise<TradeContext> {
  if (!globalForLongbridge._tradeCtx) {
    globalForLongbridge._tradeCtx = TradeContext.new(getConfig());
  }
  return globalForLongbridge._tradeCtx;
}

export async function getQuoteContext(): Promise<QuoteContext> {
  if (!globalForLongbridge._quoteCtx) {
    globalForLongbridge._quoteCtx = QuoteContext.new(getConfig());
  }
  return globalForLongbridge._quoteCtx;
}
