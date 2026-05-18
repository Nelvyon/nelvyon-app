import { NextRequest, NextResponse } from "next/server";

import { DbClient } from "../../../../../../backend/db/DbClient";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const db = DbClient.getInstance();
    await db.query(
      `INSERT INTO waitlist (email) VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()],
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
