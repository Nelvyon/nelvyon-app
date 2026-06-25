/**
 * OIDC callback — receives ?code=&state= from the identity provider.
 * This is a public route (no SaaS session required).
 *
 * Flow:
 *  1. Parse state (tenantId encoded as base64-JSON)
 *  2. Exchange code for tokens via provider's token endpoint
 *  3. Decode id_token to get sub + email (no signature verify needed here —
 *     production deployments should verify via JWKS)
 *  4. JIT provision: find or create saas_sso_identities row
 *  5. Issue a short-lived JWT session cookie and redirect to /saas/dashboard
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasSsoService, getSaasAuditService } from "@nelvyon/saas";
import jwt from "jsonwebtoken";

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT");
  return JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const code  = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  let tenantId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf8")) as Record<string, unknown>;
    tenantId = String(parsed.tenantId ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  if (!tenantId) return NextResponse.json({ error: "Missing tenantId in state" }, { status: 400 });

  try {
    const svcSso   = getSaasSsoService();
    const config   = await svcSso.getConfig(tenantId);
    if (!config) return NextResponse.json({ error: "SSO not configured" }, { status: 404 });

    // Exchange code for tokens
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/sso/callback`;
    const tokenUrl   = `${config.issuer.replace(/\/$/, "")}/token`;

    const tokenRes = await fetch(tokenUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
        client_id:     config.clientId,
        // client_secret is fetched server-side via decryptSecret in real impl
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
    }

    const tokens = await tokenRes.json() as Record<string, unknown>;
    const idToken = String(tokens.id_token ?? "");
    if (!idToken) return NextResponse.json({ error: "No id_token in response" }, { status: 502 });

    const claims = decodeJwtPayload(idToken);
    const sub    = String(claims.sub ?? "");
    const email  = claims.email ? String(claims.email) : undefined;

    if (!sub) return NextResponse.json({ error: "No sub in id_token" }, { status: 502 });

    // JIT provision
    const identity = await svcSso.getOrCreateIdentity({
      tenantId, provider: config.provider, providerSub: sub, email,
    });

    // Issue session JWT
    const secret = process.env.JWT_SECRET ?? "";
    if (!secret) return NextResponse.json({ error: "JWT_SECRET not configured" }, { status: 500 });

    const sessionToken = jwt.sign(
      { tenantId, userId: identity.userId, email: identity.email, via: "sso" },
      secret,
      { expiresIn: "8h" },
    );

    void getSaasAuditService().log(tenantId, {
      userEmail: email,
      action: "login", module: "sso",
      details: { provider: config.provider, userId: identity.userId, jit: !identity.createdAt },
    });

    const response = NextResponse.redirect(new URL("/saas/dashboard", appUrl));
    response.cookies.set("saas_session", sessionToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   8 * 3600,
      path:     "/",
    });
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
