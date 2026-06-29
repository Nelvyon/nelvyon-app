import { TikTokOAuthProvider } from "../../../../../../../../backend/oauth/TikTokOAuthProvider";
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
    return redirectIntegrationsError(origin, "tiktok_denied");
  }

  const parsed = parseOAuthState(url.searchParams.get("state"));
  if (!parsed) {
    return redirectIntegrationsError(origin, "tiktok_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectIntegrationsError(origin, "tiktok_failed");
  }

  try {
    const { accessToken, expiresAt, accountId, accountName } =
      await new TikTokOAuthProvider().exchangeCode(code);
    return finishOAuthCallback(origin, "tiktok", parsed.userId, {
      accessToken,
      expiresAt,
      accountId,
      accountName,
      scopes: [...TikTokOAuthProvider.SCOPES],
    });
  } catch {
    return redirectIntegrationsError(origin, "tiktok_failed");
  }
}
