export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasSecurityEnterpriseService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const url = new URL(req.url);
    const resource = url.searchParams.get("resource");
    const sec = getSaasSecurityEnterpriseService();

    if (resource === "ip") return NextResponse.json({ allowlist: await sec.getIpAllowlist(ctx.tenant.id) });
    if (resource === "roles") return NextResponse.json({ roles: await sec.listCustomRoles(ctx.tenant.id) });
    if (resource === "territories") return NextResponse.json({ territories: await sec.listTerritories(ctx.tenant.id) });
    if (resource === "sandboxes") return NextResponse.json({ sandboxes: await sec.listSandboxes(ctx.tenant.id) });
    if (resource === "mfa") return NextResponse.json({ mfa: await sec.getMfaStatus(ctx.tenant.id, ctx.claims.userId) });

    const [allowlist, roles, territories, mfa, sandboxes] = await Promise.all([
      sec.getIpAllowlist(ctx.tenant.id),
      sec.listCustomRoles(ctx.tenant.id),
      sec.listTerritories(ctx.tenant.id),
      sec.getMfaStatus(ctx.tenant.id, ctx.claims.userId),
      sec.listSandboxes(ctx.tenant.id),
    ]);
    return NextResponse.json({ allowlist, roles, territories, mfa, sandboxes });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const sec = getSaasSecurityEnterpriseService();

    switch (action) {
      case "ip-allowlist":
        return NextResponse.json({
          allowlist: await sec.upsertIpAllowlist(ctx.tenant.id, {
            enabled: Boolean(body.enabled),
            cidrs: Array.isArray(body.cidrs) ? body.cidrs.map(String) : [],
          }),
        });
      case "custom-role":
        return NextResponse.json({
          role: await sec.upsertCustomRole(ctx.tenant.id, {
            id: body.id ? String(body.id) : undefined,
            name: String(body.name ?? ""),
            permissions: Array.isArray(body.permissions) ? body.permissions as never[] : [],
          }),
        });
      case "assign-role":
        await sec.assignCustomRole(ctx.tenant.id, String(body.userId), String(body.roleId));
        return NextResponse.json({ ok: true });
      case "territory":
        return NextResponse.json({
          territory: await sec.upsertTerritory(ctx.tenant.id, {
            id: body.id ? String(body.id) : undefined,
            name: String(body.name ?? ""),
            regions: Array.isArray(body.regions) ? body.regions.map(String) : [],
            ownerUserId: body.ownerUserId ? String(body.ownerUserId) : undefined,
          }),
        });
      case "sandbox":
        return NextResponse.json({
          sandbox: await sec.createSandbox(ctx.tenant.id, String(body.name ?? "Sandbox"), ctx.claims.userId),
        });
      case "mfa-begin":
        return NextResponse.json({
          mfa: await sec.beginMfaEnrollment(ctx.tenant.id, ctx.claims.userId, ctx.claims.email),
        });
      case "mfa-verify":
        return NextResponse.json({ ok: await sec.verifyAndEnableMfa(ctx.claims.userId, String(body.code ?? "")) });
      case "mfa-enforce":
        await sec.setTenantMfaEnforced(ctx.tenant.id, Boolean(body.enforced));
        return NextResponse.json({ ok: true });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
