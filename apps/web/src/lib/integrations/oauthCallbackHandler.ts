import { OAuthService } from "../../../../../backend/oauth/OAuthService";
import { syncOAuthProviderToHub, syncOAuthToProductModules } from "@nelvyon/saas";
import {
  redirectIntegrationsError,
  redirectIntegrationsSuccess,
} from "@/lib/integrations/oauthRedirect";
export { createOAuthState, parseOAuthState } from "@/lib/integrations/oauthState";

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
