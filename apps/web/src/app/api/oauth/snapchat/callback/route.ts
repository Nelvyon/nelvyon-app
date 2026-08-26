import { SnapchatOAuthProvider } from "../../../../../../../../backend/oauth/SnapchatOAuthProvider";
import {
  finishOAuthCallback,
  parseOAuthState,
  verificarNonceDelNavegador,
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
    return redirectIntegrationsError(origin, "snapchat_denied");
  }

  const parsed = parseOAuthState(url.searchParams.get("state"));
  if (!parsed) {
    return redirectIntegrationsError(origin, "snapchat_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectIntegrationsError(origin, "snapchat_failed");
  }

  // Y que lo termine el MISMO navegador que lo empezo.
  //
  // La firma del `state` no responde a esto: un `state` autentico del
  // atacante, enviado a la victima, hacia que los tokens del proveedor de la
  // victima se guardaran a nombre del atacante. No vale reutilizar la cookie
  // de sesion de NELVYON: es `sameSite: "strict"` y no viaja en el redirect
  // que llega desde el proveedor.
  if (!verificarNonceDelNavegador(req, parsed)) {
    return redirectIntegrationsError(origin, "snapchat_failed");
  }

  try {
    const { accessToken, refreshToken, expiresAt, accountId, accountName } =
      await new SnapchatOAuthProvider().exchangeCode(code);
    return finishOAuthCallback(origin, "snapchat", parsed.userId, {
      accessToken,
      refreshToken,
      expiresAt,
      accountId,
      accountName,
      scopes: [...SnapchatOAuthProvider.SCOPES],
    });
  } catch {
    return redirectIntegrationsError(origin, "snapchat_failed");
  }
}
