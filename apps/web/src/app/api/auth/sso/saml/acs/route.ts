/** SAML 2.0 ACS — POST assertion, JIT provision, nelvyon_token session. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSaasAuditService, getSaasSsoService } from "@nelvyon/saas";

import { issueSaasSessionRedirect } from "@/lib/sso/issueSaasSession";
import { parseSamlResponse } from "@/lib/sso/samlParse";

export async function POST(req: Request) {
  const form = await req.formData();
  const samlResponse = String(form.get("SAMLResponse") ?? "");
  const relayState = String(form.get("RelayState") ?? "");

  if (!samlResponse) {
    return NextResponse.json({ error: "Missing SAMLResponse" }, { status: 400 });
  }

  let tenantId = "";
  try {
    const parsed = JSON.parse(Buffer.from(relayState, "base64url").toString("utf8")) as Record<string, unknown>;
    tenantId = String(parsed.tenantId ?? "");
  } catch {
    try {
      const parsed = JSON.parse(Buffer.from(relayState, "base64").toString("utf8")) as Record<string, unknown>;
      tenantId = String(parsed.tenantId ?? "");
    } catch {
      return NextResponse.json({ error: "Invalid RelayState" }, { status: 400 });
    }
  }

  if (!tenantId) return NextResponse.json({ error: "Missing tenantId in RelayState" }, { status: 400 });

  try {
    const svcSso = getSaasSsoService();
    const config = await svcSso.getConfig(tenantId);
    if (!config) return NextResponse.json({ error: "SSO not configured" }, { status: 404 });
    if (config.provider !== "saml") {
      return NextResponse.json({ error: "Tenant SSO is OIDC" }, { status: 400 });
    }

    const assertion = await parseSamlResponse(samlResponse, {
      metadataUrl: config.metadataUrl,
    });
    const email = assertion.email ?? (assertion.nameId.includes("@") ? assertion.nameId : undefined);

    const identity = await svcSso.getOrCreateIdentity({
      tenantId,
      provider: "saml",
      providerSub: assertion.nameId,
      email,
    });

    await svcSso.ensureWorkspaceMember({
      tenantId,
      userId: identity.userId,
      email: email ?? identity.email ?? undefined,
    });

    void getSaasAuditService().log(tenantId, {
      userEmail: email,
      action: "login",
      module: "sso",
      details: { provider: "saml", userId: identity.userId },
    });

    return issueSaasSessionRedirect({
      tenantId,
      userId: identity.userId,
      email: email ?? identity.email ?? assertion.nameId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SAML processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
