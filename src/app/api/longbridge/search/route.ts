import { NextResponse } from "next/server";
import { getQuoteContext } from "@/lib/longbridge/client";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Use Longbridge HTTP API for real search since SDK doesn't have search
async function searchViaHTTP(keyword: string): Promise<Array<{ symbol: string; name: string; currency: string }>> {
  const appKey = process.env.LONGPORT_APP_KEY;
  const appSecret = process.env.LONGPORT_APP_SECRET;
  const accessToken = process.env.LONGPORT_ACCESS_TOKEN;

  if (!appKey || !appSecret || !accessToken) return [];

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = "GET";
  const path = `/v1/quote/search?keyword=${encodeURIComponent(keyword)}`;
  const baseUrl = process.env.LONGPORT_HTTP_URL || "https://openapi.longportapp.com";

  // Build signature
  const signPayload = `${method}\n${path}\n${timestamp}\n`;
  const signature = crypto
    .createHmac("sha256", appSecret)
    .update(signPayload)
    .digest("hex");

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        "X-Api-Key": appKey,
        "X-Timestamp": timestamp,
        "X-Api-Signature": signature,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) return [];
    const data = await res.json();

    // Longbridge search API returns { data: { list: [...] } }
    const list = data?.data?.list || data?.data || [];
    return Array.isArray(list)
      ? list.map((item: Record<string, string>) => ({
          symbol: item.symbol || "",
          name: item.name_en || item.name_cn || item.name || item.symbol || "",
          currency: item.currency || (item.symbol?.endsWith(".HK") ? "HKD" : "USD"),
        })).filter((r: { symbol: string }) => r.symbol)
      : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("q")?.trim();

    if (!keyword) {
      return NextResponse.json([]);
    }

    // First try HTTP search API for name-based fuzzy search
    const httpResults = await searchViaHTTP(keyword);
    if (httpResults.length > 0) {
      return NextResponse.json(httpResults.slice(0, 10));
    }

    // Fallback: try exact symbol match via SDK staticInfo
    const ctx = await getQuoteContext();
    const candidates: string[] = [];

    if (!keyword.includes(".")) {
      candidates.push(`${keyword.toUpperCase()}.US`);
      candidates.push(`${keyword.toUpperCase()}.HK`);
    } else {
      candidates.push(keyword.toUpperCase());
    }

    if (/^\d+$/.test(keyword)) {
      const padded = keyword.padStart(4, "0");
      candidates.push(`${padded}.HK`);
    }

    const results: Array<{ symbol: string; name: string; currency: string }> = [];

    for (const sym of candidates) {
      try {
        const infos = await ctx.staticInfo([sym]);
        for (const info of infos) {
          results.push({
            symbol: info.symbol,
            name: info.nameEn || info.nameCn || info.symbol,
            currency: info.currency,
          });
        }
      } catch {
        // Symbol doesn't exist
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json([]);
  }
}
