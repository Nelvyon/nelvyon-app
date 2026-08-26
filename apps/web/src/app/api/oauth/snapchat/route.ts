import { NextResponse } from "next/server";

import { authenticate } from "@/lib/auth";
import { OsAgentError } from "@nelvyon/os-agents";

import { SnapchatOAuthProvider } from "../../../../../../../backend/oauth/SnapchatOAuthProvider";
import { aplicarCookieDeNonce, crearEstadoOAuth } from "@/lib/integrations/oauthState";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const claims = await authenticate(req);
    // El `state` firmado dice quien EMPIEZA el flujo. La cookie del nonce
    // es lo que permite comprobar en el callback que quien lo TERMINA es el
    // mismo navegador.
    const { state, nonce } = crearEstadoOAuth(claims.userId);
    const url = new SnapchatOAuthProvider().getAuthUrl(state);
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
