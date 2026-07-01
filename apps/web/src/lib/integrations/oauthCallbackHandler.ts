import { OAuthService } from "../../../../../backend/oauth/OAuthService";
import { syncOAuthProviderToHub, syncOAuthToProductModules } from "@nelvyon/saas";
import {
  redirectIntegrationsError,
  redirectIntegrationsSuccess,
} from "@/lib/integrations/oauthRedirect";

export function parseOAuthState(state: string | null): { userId: string; ts: number } | null {
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

export async function finishOAuthCallback(
  origin: string,
  provider: string,
  userId: string,
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    accountId?: string;
    accountName?: string;
    scopes: string[];
  },
) {
  await OAuthService.instance().saveConnection(userId, provider, data);
  await syncOAuthProviderToHub(userId, provider, data.accountName ?? null);
  await syncOAuthToProductModules(userId, provider, data);
  return redirectIntegrationsSuccess(origin, provider);
}

export { redirectIntegrationsError };
