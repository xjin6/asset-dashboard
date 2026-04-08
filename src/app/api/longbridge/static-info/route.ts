import { NextResponse } from "next/server";
import { getQuoteContext } from "@/lib/longbridge/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols");

    if (!symbolsParam) {
      return NextResponse.json({});
    }

    const symbols = symbolsParam.split(",").filter(Boolean);
    if (symbols.length === 0) return NextResponse.json({});

    const ctx = await getQuoteContext();
    const infos = await ctx.staticInfo(symbols);

    const result: Record<string, { name: string; currency: string }> = {};
    for (const info of infos) {
      result[info.symbol] = {
        name: info.nameEn || info.nameCn || info.symbol,
        currency: info.currency,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch static info:", error);
    return NextResponse.json({});
  }
}
