import { LinkedInOAuthProvider } from "../../../../../../../../backend/oauth/LinkedInOAuthProvider";
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
  const code = url.searchParams.get("code");

  if (error || !code) {
    return redirectIntegrationsError(origin, "linkedin_denied");
  }

  const parsed = parseOAuthState(url.searchParams.get("state"));
  if (!parsed) {
    return redirectIntegrationsError(origin, "linkedin_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectIntegrationsError(origin, "linkedin_failed");
  }

  try {
    const { accessToken, refreshToken, expiresAt, accountId, accountName } =
      await new LinkedInOAuthProvider().exchangeCode(code);
    return finishOAuthCallback(origin, "linkedin", parsed.userId, {
      accessToken,
      refreshToken: refreshToken || undefined,
      expiresAt,
      accountId,
      accountName,
      scopes: [...LinkedInOAuthProvider.SCOPES],
    });
  } catch {
    return redirectIntegrationsError(origin, "linkedin_failed");
  }
}
