import { NextResponse } from "next/server";

import { applyNelvyonAuthCookie } from "@/lib/authCookies";
import { getAuthService } from "@nelvyon/auth";
import { OsAgentError } from "@nelvyon/os-agents";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }
  const email = body.email;
  const password = body.password;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "email and password are required (strings)" }, { status: 400 });
  }

  try {
    const auth = getAuthService();
    const result = await auth.login(email, password);
    const res = NextResponse.json({
      userId: result.userId,
      email: result.email,
      tenantId: result.tenantId,
      token: result.token,
      expiresAt: result.expiresAt,
    });
    applyNelvyonAuthCookie(res, result.token);
    return res;
  } catch (e: unknown) {
    if (e instanceof OsAgentError) {
      if (e.message === "Invalid credentials") {
        const msg = "Credenciales incorrectas";
        return NextResponse.json({ error: msg, message: msg }, { status: 401 });
      }
      return NextResponse.json({ error: e.message, message: e.message }, { status: 400 });
    }
    throw e;
  }
}
