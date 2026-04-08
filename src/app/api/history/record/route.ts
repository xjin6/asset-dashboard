import { NextResponse } from "next/server";
import { recordOnce } from "@/lib/background/history-recorder";

export const dynamic = "force-dynamic";

// Called by Vercel Cron (hourly) as a backup to the positions-route trigger
export async function GET() {
  try {
    await recordOnce();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Cron] History record failed:", error);
    return NextResponse.json({ error: "Record failed" }, { status: 500 });
  }
}
