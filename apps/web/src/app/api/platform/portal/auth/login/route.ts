import { NextResponse } from "next/server";

import { loginPortalUserBff } from "@/lib/portal/portalAuthStore";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await loginPortalUserBff({
      email: body.email ?? "",
      password: body.password ?? "",
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "login failed";
    const status = message.includes("invalid") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
