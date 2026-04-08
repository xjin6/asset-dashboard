import { NextResponse } from "next/server";
import { fetchAccountBalance } from "@/lib/longbridge/trade";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get("currency") || undefined;
    const balances = await fetchAccountBalance(currency);
    return NextResponse.json(balances);
  } catch (error) {
    console.error("Failed to fetch account balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch account balance" },
      { status: 500 }
    );
  }
}
