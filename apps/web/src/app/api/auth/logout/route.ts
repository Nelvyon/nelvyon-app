import { NextResponse } from "next/server";

import { clearNelvyonAuthCookie } from "@/lib/authCookies";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearNelvyonAuthCookie(res);
  return res;
}
