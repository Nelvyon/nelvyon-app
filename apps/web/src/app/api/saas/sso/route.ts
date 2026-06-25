export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasSsoService,
  getSaasAuditService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "sso.read");
    const svc = getSaasSsoService();

    const url = new URL(req.url);
    const resource = url.searchParams.get("resource") ?? "config";

    if (resource === "identities") {
      const identities = await svc.listIdentities(ctx.tenant.id);
      return NextResponse.json({ identities });
    }

    const config = await svc.getConfig(ctx.tenant.id);
    return NextResponse.json({ config });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx    = await requireSaasContext(req, "sso.write");
    const body   = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "configure");
    const svc    = getSaasSsoService();
    const audit  = getSaasAuditService();

    if (action === "configure") {
      const config = await svc.upsertConfig(ctx.tenant.id, {
        provider:    String(body.provider ?? "oidc") as "oidc" | "saml",
        issuer:      String(body.issuer ?? ""),
        clientId:    String(body.clientId ?? ""),
        clientSecret:String(body.clientSecret ?? ""),
        metadataUrl: body.metadataUrl ? String(body.metadataUrl) : undefined,
        domains:     Array.isArray(body.domains) ? (body.domains as string[]) : [],
      });
      void audit.log(ctx.tenant.id, {
        userEmail: ctx.claims.userId,
        action: "update", module: "sso",
        details: { provider: config.provider, domains: config.domains },
      });
      return NextResponse.json({ config });
    }

    if (action === "toggle-enforce") {
      const enforced = Boolean(body.enforced);
      const config   = await svc.toggleEnforce(ctx.tenant.id, enforced);
      void audit.log(ctx.tenant.id, {
        userEmail: ctx.claims.userId,
        action: enforced ? "publish" : "update", module: "sso",
        details: { enforced },
      });
      return NextResponse.json({ config });
    }

    if (action === "delete") {
      await svc.deleteConfig(ctx.tenant.id);
      void audit.log(ctx.tenant.id, {
        userEmail: ctx.claims.userId,
        action: "delete", module: "sso",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
