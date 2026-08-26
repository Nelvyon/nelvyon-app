import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { GoogleOAuthProvider } from "../../../../../../../backend/oauth/GoogleOAuthProvider";
import { aplicarCookieDeNonce, crearEstadoOAuth } from "@/lib/integrations/oauthState";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    // El `state` firmado dice quien EMPIEZA el flujo. La cookie del nonce
    // es lo que permite comprobar en el callback que quien lo TERMINA es el
    // mismo navegador; sin ella, un `state` legitimo enviado a la victima
    // cuelga la cuenta del proveedor de la victima del atacante.
    const { state, nonce } = crearEstadoOAuth(claims.userId);
    const url = new GoogleOAuthProvider().getAuthUrl(state);
    const res = NextResponse.redirect(url);
    aplicarCookieDeNonce(res, nonce);
    return res;
  } catch (e: unknown) {
    if (e instanceof OsAgentError && e.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw e;
  }
}
