import { NextResponse } from "next/server";

import { acceptPortalInviteBff } from "@/lib/portal/portalAuthStore";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!platformDbFallbackEnabled()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }

  let body: { token?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await acceptPortalInviteBff({
      token: body.token ?? "",
      password: body.password ?? "",
      name: body.name,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "accept failed";
    const status =
      message.includes("invalid") || message.includes("already") || message.includes("password")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
