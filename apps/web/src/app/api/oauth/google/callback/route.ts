import { NextResponse } from "next/server";

import { GoogleOAuthProvider } from "../../../../../../../../backend/oauth/GoogleOAuthProvider";
import { OAuthService } from "../../../../../../../../backend/oauth/OAuthService";

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
  if (error) {
    return redirectToIntegrations(origin, "error=google_denied");
  }

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const parsed = parseState(stateRaw);
  if (!code || !parsed) {
    return redirectToIntegrations(origin, "error=google_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectToIntegrations(origin, "error=google_failed");
  }

  try {
    const tokens = await new GoogleOAuthProvider().exchangeCode(code);
    await OAuthService.instance().saveConnection(parsed.userId, "google", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || undefined,
      expiresAt: tokens.expiresAt,
      accountId: tokens.accountId,
      accountName: tokens.accountName,
      scopes: [...GoogleOAuthProvider.SCOPES],
    });
    return redirectToIntegrations(origin, "success=google");
  } catch {
    return redirectToIntegrations(origin, "error=google_failed");
  }
}
