import { MetaOAuthProvider } from "../../../../../../../../backend/oauth/MetaOAuthProvider";
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
    return redirectIntegrationsError(origin, "meta_denied");
  }

  const parsed = parseOAuthState(url.searchParams.get("state"));
  if (!parsed) {
    return redirectIntegrationsError(origin, "meta_failed");
  }
  if (Date.now() - parsed.ts > 10 * 60 * 1000) {
    return redirectIntegrationsError(origin, "meta_failed");
  }

  // Y que lo termine el MISMO navegador que lo empezo.
  //
  // La firma del `state` no responde a esto: un `state` autentico del
  // atacante, enviado a la victima, hacia que los tokens del proveedor de la
  // victima se guardaran a nombre del atacante. No vale reutilizar la cookie
  // de sesion de NELVYON: es `sameSite: "strict"` y no viaja en el redirect
  // que llega desde el proveedor.
  if (!verificarNonceDelNavegador(req, parsed)) {
    return redirectIntegrationsError(origin, "meta_failed");
  }

  try {
    const provider = new MetaOAuthProvider();
    const short = await provider.exchangeCode(code);
    const long = await provider.getLongLivedToken(short.accessToken);
    return finishOAuthCallback(origin, "meta", parsed.userId, {
      accessToken: long.accessToken,
      expiresAt: long.expiresAt,
      accountId: short.accountId,
      accountName: short.accountName,
      scopes: [...MetaOAuthProvider.SCOPES],
    });
  } catch {
    return redirectIntegrationsError(origin, "meta_failed");
  }
}
