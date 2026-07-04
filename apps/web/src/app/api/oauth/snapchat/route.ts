import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { SnapchatOAuthProvider } from "../../../../../../../backend/oauth/SnapchatOAuthProvider";
import { createOAuthState } from "@/lib/integrations/oauthState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const state = createOAuthState(claims.userId);
    const url = new SnapchatOAuthProvider().getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
