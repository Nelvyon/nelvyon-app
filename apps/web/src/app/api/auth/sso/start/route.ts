/** Start OIDC or SAML SSO flow for a tenant. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import crypto from "crypto";
import { NextResponse } from "next/server";
import { buildOidcAuthUrl, getSaasSsoService } from "@nelvyon/saas";

import { buildSamlAuthnRedirectUrl } from "@/lib/sso/samlParse";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId")?.trim();
  const email = url.searchParams.get("email")?.trim();

  let resolvedTenantId = tenantId ?? null;
  if (!resolvedTenantId && email?.includes("@")) {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain) {
      resolvedTenantId = await getSaasSsoService().resolveTenantByDomain(domain);
    }
  }

  if (!resolvedTenantId) {
    return NextResponse.json({ error: "tenantId or email domain required" }, { status: 400 });
  }

  const config = await getSaasSsoService().getConfig(resolvedTenantId);
  if (!config) {
    return NextResponse.json({ error: "SSO not configured for tenant" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const state = Buffer.from(JSON.stringify({ tenantId: resolvedTenantId, n: crypto.randomUUID() })).toString("base64url");

  if (config.provider === "saml") {
    const acsUrl = `${appUrl}/api/auth/sso/saml/acs`;
    const idpSsoUrl = config.metadataUrl ?? config.issuer;
    if (!idpSsoUrl?.trim()) {
      return NextResponse.json({ error: "SAML IdP SSO URL not configured" }, { status: 400 });
    }
    const redirectUrl = buildSamlAuthnRedirectUrl({
      idpSsoUrl,
      acsUrl,
      issuer: appUrl,
      relayState: state,
    });
    return NextResponse.redirect(redirectUrl);
  }

  const nonce = crypto.randomUUID();
  const authUrl = buildOidcAuthUrl({
    issuer: config.issuer,
    clientId: config.clientId,
    redirectUri: `${appUrl}/api/auth/sso/callback`,
    state,
    nonce,
  });
  return NextResponse.redirect(authUrl);
}
