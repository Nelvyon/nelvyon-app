import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { MetaOAuthProvider } from "../../../../../../../backend/oauth/MetaOAuthProvider";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    const state = Buffer.from(
      JSON.stringify({ userId: claims.userId, ts: Date.now() }),
    ).toString("base64url");
    const url = new MetaOAuthProvider().getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
