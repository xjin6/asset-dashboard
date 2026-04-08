import { NextResponse } from "next/server";
import { fetchCashFlow } from "@/lib/longbridge/trade";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const businessType = searchParams.get("businessType");
    const page = searchParams.get("page");
    const size = searchParams.get("size");

    const now = new Date();
    const startAt = startParam
      ? new Date(startParam)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endAt = endParam ? new Date(endParam) : now;

    const flows = await fetchCashFlow(
      startAt,
      endAt,
      businessType ? Number(businessType) : undefined,
      page ? Number(page) : undefined,
      size ? Number(size) : undefined
    );

    return NextResponse.json(flows);
  } catch (error) {
    console.error("Failed to fetch cash flow:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow" },
      { status: 500 }
    );
  }
}
