import { NextResponse } from "next/server";
import { storageGet, storageSet } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    const data = await storageGet(key);
    return NextResponse.json(data ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(request: Request) {
  try {
    const { key, data } = await request.json();
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

    await storageSet(key, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Storage write error:", error);
    return NextResponse.json({ error: "Write failed" }, { status: 500 });
  }
}
