import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { OAuthService, type OAuthProvider } from "../../../../../../../../backend/oauth/OAuthService";

export const runtime = "nodejs";

const ALLOWED: OAuthProvider[] = ["google", "meta", "tiktok", "linkedin"];

export async function DELETE(
  req: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    if (!ALLOWED.includes(provider as OAuthProvider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    const claims = await authenticate(req);
    await OAuthService.instance().deleteConnection(claims.userId, provider);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
