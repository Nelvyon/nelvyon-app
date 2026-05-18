import { NextResponse } from "next/server";

import { MetaOAuthProvider } from "../../../../../../../../backend/oauth/MetaOAuthProvider";
import { OAuthService } from "../../../../../../../../backend/oauth/OAuthService";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const INTEGRATIONS_PATH = "/saas/dashboard/integrations";

function redirectToIntegrations(origin: string, query: string): NextResponse {
  return NextResponse.redirect(new URL(`${INTEGRATIONS_PATH}?${query}`, origin));
}

function parseState(state: string | null): { userId: string; ts: number } | null {
  if (!state) return null;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId?: string;
      ts?: number;
    };
    if (!parsed.userId || typeof parsed.ts !== "number") return null;
    return { userId: parsed.userId, ts: parsed.ts };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error || !code) {
    return redirectToIntegrations(origin, "error=meta_denied");
  }

  const stateRaw = url.searchParams.get("state");
  const parsed = parseState(stateRaw);
  if (!parsed) {
    return redirectToIntegrations(origin, "error=meta_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectToIntegrations(origin, "error=meta_failed");
  }

  try {
    const provider = new MetaOAuthProvider();
    const short = await provider.exchangeCode(code);
    const long = await provider.getLongLivedToken(short.accessToken);
    await OAuthService.instance().saveConnection(parsed.userId, "meta", {
      accessToken: long.accessToken,
      expiresAt: long.expiresAt,
      accountId: short.accountId,
      accountName: short.accountName,
      scopes: [...MetaOAuthProvider.SCOPES],
    });
    return redirectToIntegrations(origin, "success=meta");
  } catch {
    return redirectToIntegrations(origin, "error=meta_failed");
  }
}
