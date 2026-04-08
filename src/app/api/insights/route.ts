import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PositionData {
  symbolName: string;
  symbol: string;
  currentPrice: number;
  costPrice: number;
  unrealizedPLPercent: number;
  dailyPLPercent: number;
  marketValue: number;
  currency: string;
}

interface ManualPosition {
  symbolName: string;
  symbol: string;
  quantity: number;
  currentPrice: number;
  marketValue: number;
  currency: string;
}

interface SavingsEntry {
  amount: number;
  currency: string;
}

interface SavingsAccount {
  name: string;
  entries: SavingsEntry[];
}

async function callAI(messages: ChatMessage[]): Promise<string> {
  const useAzure =
    process.env.AZURE_AI_ENDPOINT &&
    process.env.AZURE_AI_KEY &&
    !process.env.AZURE_AI_ENDPOINT.includes("your-resource");

  if (useAzure) {
    const rawEndpoint = process.env.AZURE_AI_ENDPOINT!;
    const baseEndpoint = rawEndpoint.replace(/\/api\/projects\/[^/]+\/?$/, "").replace(/\/$/, "");
    const apiKey = process.env.AZURE_AI_KEY!;
    const model = process.env.AZURE_AI_MODEL ?? "Phi-4";
    const url = `${baseEndpoint}/models/chat/completions?api-version=2024-05-01-preview`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ model, max_tokens: 900, messages }),
    });
    if (!res.ok) throw new Error(`Azure AI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const content = message.content[0];
  return content.type === "text" ? content.text : "";
}

function buildPortfolioContext(body: {
  positions?: PositionData[];
  balance?: { totalCash?: number };
  totalAssets?: number;
  grandTotal?: number;
  morganPositions?: ManualPosition[];
  fidelityPositions?: ManualPosition[];
  savingsAccounts?: SavingsAccount[];
  fxRates?: Record<string, number>;
}): string {
  const { positions, balance, totalAssets, grandTotal, morganPositions, fidelityPositions, savingsAccounts, fxRates } = body;

  const lb = (positions ?? []).map((p) => {
    const plSign = p.unrealizedPLPercent >= 0 ? "+" : "";
    const daySign = p.dailyPLPercent >= 0 ? "+" : "";
    return `  - ${p.symbolName} (${p.symbol}): ${p.currentPrice} ${p.currency}, P&L ${plSign}${p.unrealizedPLPercent.toFixed(2)}%, daily ${daySign}${p.dailyPLPercent.toFixed(2)}%, MV ${p.marketValue.toFixed(0)} ${p.currency}`;
  }).join("\n");

  const morgan = (morganPositions ?? []).map((p) =>
    `  - ${p.symbolName} (${p.symbol}): ${p.quantity} shares @ ${p.currentPrice} ${p.currency}, MV ${p.marketValue.toFixed(0)} ${p.currency}`
  ).join("\n");

  const fidelity = (fidelityPositions ?? []).map((p) =>
    `  - ${p.symbolName} (${p.symbol}): ${p.quantity} shares @ ${p.currentPrice} ${p.currency}, MV ${p.marketValue.toFixed(0)} ${p.currency}`
  ).join("\n");

  const savings = (savingsAccounts ?? []).map((acct) => {
    const entries = acct.entries.map((e) => `${e.amount} ${e.currency}`).join(", ");
    return `  - ${acct.name}: ${entries}`;
  }).join("\n");

  const rates = fxRates ? Object.entries(fxRates).filter(([k]) => k !== "HKD").map(([k, v]) => `${k}/HKD=${v.toFixed(4)}`).join(", ") : "";

  return `=== FULL PORTFOLIO SNAPSHOT ===
FX Rates: ${rates || "HKD base"}

[Longbridge]
${lb || "  (no positions)"}
Cash: ${balance?.totalCash?.toFixed(0) ?? "N/A"} HKD
Longbridge Total: ${totalAssets?.toFixed(0) ?? "N/A"} HKD

[Morgan Stanley Stock Plan]
${morgan || "  (no positions)"}

[Fidelity Net Benefits]
${fidelity || "  (no positions)"}

[Savings]
${savings || "  (no accounts)"}

Grand Total (all brokers): ${grandTotal?.toFixed(0) ?? "N/A"} HKD
================================`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, chatHistory, userMessage } = body;

    const useAzure = process.env.AZURE_AI_ENDPOINT && process.env.AZURE_AI_KEY && !process.env.AZURE_AI_ENDPOINT.includes("your-resource");
    const useAnthropic = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_api_key_here";

    if (!useAzure && !useAnthropic) {
      return NextResponse.json({ error: "No AI backend configured" }, { status: 400 });
    }

    const portfolioContext = buildPortfolioContext(body);

    // Fetch recent financial news headlines via Google News RSS (free, no key needed)
    let newsContext = "";
    try {
      const symbols = (body.positions ?? []).map((p: PositionData) => p.symbolName).join(" OR ");
      const query = encodeURIComponent(`stock market ${symbols} finance`);
      const rssRes = await fetch(
        `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const titles = [...xml.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
          .slice(1, 6) // skip feed title, take first 5 items
          .map(m => m[1]);
        if (titles.length > 0) {
          newsContext = `\n=== RECENT MARKET NEWS ===\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n===========================`;
        }
      }
    } catch { /* news fetch is optional, ignore failures */ }

    const systemMessage: ChatMessage = {
      role: "user",
      content: `You are a personal finance advisor with access to the user's complete portfolio and recent market news. Be direct, specific, use concrete numbers. No generic disclaimers.

${portfolioContext}${newsContext}`,
    };

    let messages: ChatMessage[];

    if (mode === "insights") {
      messages = [
        systemMessage,
        {
          role: "assistant",
          content: "I have your full portfolio and latest news. I'll provide a comprehensive analysis.",
        },
        {
          role: "user",
          content: `Analyze my portfolio with these 4 sections (use bold headers):

**Today's Performance** — Daily P&L by position, highlight biggest movers, any intraday alerts.

**Portfolio Health** — Total P&L across all brokers, concentration risk, diversification assessment (tech vs HK vs cash vs savings).

**News Impact** — Based on the recent headlines, identify any direct risks or opportunities for my specific holdings. Flag any warnings.

**Recommendations** — 2-3 concrete, actionable suggestions (rebalancing, hedging, or opportunities) based on current allocation and market conditions.

Be specific with numbers. Keep each section to 2-3 sentences.`,
        },
      ];
    } else {
      // Chat mode — include history
      messages = [
        systemMessage,
        { role: "assistant", content: "I have your full portfolio data. How can I help?" },
        ...(chatHistory ?? []) as ChatMessage[],
        { role: "user", content: userMessage },
      ];
    }

    const reply = await callAI(messages);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI insights error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
