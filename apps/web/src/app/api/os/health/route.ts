import { NextResponse } from "next/server";
import { DbClient } from "@/../../backend/db/DbClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    await DbClient.getInstance().query("SELECT 1");
    return NextResponse.json({ ok: true, os: "up", db: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, os: "degraded", db: "error" }, { status: 503 });
  }
}
