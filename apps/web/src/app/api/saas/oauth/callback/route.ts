import { authenticate } from "@nelvyon/auth";
import {
  getSaasOnboardingService,
  resolveOAuthProviderByState,
  syncOAuthProviderToHub,
} from "@nelvyon/saas";
import {
  platformApiBase,
  readSessionToken,
  stableWorkspaceIdFromTenant,
} from "@/lib/platformFastApiProxy";
import {
  redirectIntegrationsError,
  redirectIntegrationsSuccess,
} from "@/lib/integrations/oauthRedirect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * OAuth callback for FastAPI providers (hubspot, slack).
 * Exchanges code via POST /api/v1/oauth/callback and syncs hub status.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = url.origin;

  if (error) {
    return redirectIntegrationsError(origin, error);
  }
  if (!code || !state) {
    return redirectIntegrationsError(origin, "missing_params");
  }

  const provider = await resolveOAuthProviderByState(state);
  if (!provider) {
    return redirectIntegrationsError(origin, "invalid_state");
  }

  const token = await readSessionToken(req);
  if (!token) {
    return redirectIntegrationsError(origin, "unauthorized");
  }

  let workspaceId: number;
  let userId: string;
  try {
    const claims = await authenticate(req);
    userId = claims.userId;
    const tenant = await getSaasOnboardingService().getTenant(claims.userId);
    workspaceId = tenant?.workspaceId ?? stableWorkspaceIdFromTenant(tenant?.id ?? claims.userId);
  } catch {
    return redirectIntegrationsError(origin, "unauthorized");
  }

  try {
    const backendRes = await fetch(`${platformApiBase()}/api/v1/oauth/callback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Workspace-Id": String(workspaceId),
        Accept: "application/json",
      },
      body: JSON.stringify({ provider, code, state }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!backendRes.ok) {
      const err = (await backendRes.json().catch(() => ({}))) as { detail?: string };
      return redirectIntegrationsError(origin, err.detail ?? `backend_${backendRes.status}`);
    }

    await syncOAuthProviderToHub(userId, provider);
    return redirectIntegrationsSuccess(origin, provider);
  } catch {
    return redirectIntegrationsError(origin, "timeout");
  }
}
