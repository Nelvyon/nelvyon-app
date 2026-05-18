import { NextResponse } from "next/server";

import { LinkedInOAuthProvider } from "../../../../../../../../backend/oauth/LinkedInOAuthProvider";
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
    return redirectToIntegrations(origin, "error=linkedin_denied");
  }

  const stateRaw = url.searchParams.get("state");
  const parsed = parseState(stateRaw);
  if (!parsed) {
    return redirectToIntegrations(origin, "error=linkedin_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectToIntegrations(origin, "error=linkedin_failed");
  }

  try {
    const { accessToken, refreshToken, expiresAt, accountId, accountName } =
      await new LinkedInOAuthProvider().exchangeCode(code);
    await OAuthService.instance().saveConnection(parsed.userId, "linkedin", {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      accountId,
      accountName,
      scopes: [...LinkedInOAuthProvider.SCOPES],
    });
    return redirectToIntegrations(origin, "success=linkedin");
  } catch {
    return redirectToIntegrations(origin, "error=linkedin_failed");
  }
}
