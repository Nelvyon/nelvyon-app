import { NextResponse } from "next/server";

import { GoogleOAuthProvider } from "../../../../../../../../backend/oauth/GoogleOAuthProvider";
import {
  finishOAuthCallback,
  parseOAuthState,
  redirectIntegrationsError,
} from "@/lib/integrations/oauthCallbackHandler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const error = url.searchParams.get("error");
  if (error) {
    return redirectIntegrationsError(origin, "google_denied");
  }

  const code = url.searchParams.get("code");
  const parsed = parseOAuthState(url.searchParams.get("state"));
  if (!code || !parsed) {
    return redirectIntegrationsError(origin, "google_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectIntegrationsError(origin, "google_failed");
  }

  try {
    const tokens = await new GoogleOAuthProvider().exchangeCode(code);
    return finishOAuthCallback(origin, "google", parsed.userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || undefined,
      expiresAt: tokens.expiresAt,
      accountId: tokens.accountId,
      accountName: tokens.accountName,
      scopes: [...GoogleOAuthProvider.SCOPES],
    });
  } catch {
    return redirectIntegrationsError(origin, "google_failed");
  }
}
