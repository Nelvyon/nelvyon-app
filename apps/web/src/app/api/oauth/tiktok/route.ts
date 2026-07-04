import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { TikTokOAuthProvider } from "../../../../../../../backend/oauth/TikTokOAuthProvider";
import { createOAuthState } from "@/lib/integrations/oauthState";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const state = createOAuthState(claims.userId);
    const url = new TikTokOAuthProvider().getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
