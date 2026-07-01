/**
 * OIDC callback — exchange code, verify id_token (jose JWKS), JIT provision, nelvyon_token session.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasAuditService, getSaasSsoService } from "@nelvyon/saas";

import { issueSaasSessionRedirect } from "@/lib/sso/issueSaasSession";
import { buildOidcTokenUrl, verifyOidcIdToken } from "@/lib/sso/oidcVerify";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  let tenantId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as Record<string, unknown>;
    tenantId = String(parsed.tenantId ?? "");
  } catch {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf8")) as Record<string, unknown>;
      tenantId = String(parsed.tenantId ?? "");
    } catch {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
    }
  }

  if (!tenantId) return NextResponse.json({ error: "Missing tenantId in state" }, { status: 400 });

  try {
    const svcSso = getSaasSsoService();
    const config = await svcSso.getConfig(tenantId);
    if (!config) return NextResponse.json({ error: "SSO not configured" }, { status: 404 });
    if (config.provider !== "oidc") {
      return NextResponse.json({ error: "Tenant SSO is SAML — use ACS endpoint" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/sso/callback`;
    const clientSecret = await svcSso.getClientSecret(tenantId);
    const tokenUrl = buildOidcTokenUrl(config.issuer);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: config.clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => "");
      return NextResponse.json({ error: "Token exchange failed", detail: errText.slice(0, 200) }, { status: 502 });
    }

    const tokens = (await tokenRes.json()) as Record<string, unknown>;
    const idToken = String(tokens.id_token ?? "");
    if (!idToken) return NextResponse.json({ error: "No id_token in response" }, { status: 502 });

    const claims = await verifyOidcIdToken({
      idToken,
      issuer: config.issuer,
      clientId: config.clientId,
      jwksUri: config.metadataUrl ?? undefined,
    });

    const sub = String(claims.sub ?? "");
    const email = claims.email ? String(claims.email) : undefined;
    if (!sub) return NextResponse.json({ error: "No sub in id_token" }, { status: 502 });

    const identity = await svcSso.getOrCreateIdentity({
      tenantId,
      provider: config.provider,
      providerSub: sub,
      email,
    });

    await svcSso.ensureWorkspaceMember({
      tenantId,
      userId: identity.userId,
      email: email ?? identity.email ?? undefined,
    });

    void getSaasAuditService().log(tenantId, {
      userEmail: email ?? identity.email ?? undefined,
      action: "login",
      module: "sso",
      details: { provider: config.provider, userId: identity.userId },
    });

    return issueSaasSessionRedirect({
      tenantId,
      userId: identity.userId,
      email: email ?? identity.email ?? `${sub}@sso.local`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
