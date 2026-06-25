import { NextResponse } from "next/server";
import {
  getSaasApiKeysService,
  getSaasAuditService,
  SaasApiKeysError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasApiKeysError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const keys = await getSaasApiKeysService().list(ctx.tenant.id);
    return NextResponse.json({ keys });
  } catch (e: unknown) {
    if (e instanceof SaasApiKeysError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const result = await getSaasApiKeysService().create(ctx.tenant.id, ctx.claims.userId ?? null, {
      name: typeof b.name === "string" ? b.name : "",
      scopes: Array.isArray(b.scopes) ? b.scopes.filter((x): x is string => typeof x === "string") : undefined,
      expiresAt: typeof b.expires_at === "string" ? b.expires_at : null,
    });
    void getSaasAuditService().log(ctx.tenant.id, {
      action: "create", module: "api-keys",
      resourceId: result.key.id,
      details: { name: result.key.name, scopes: result.key.scopes },
    });
    return NextResponse.json({ key: result.key, rawKey: result.rawKey }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasApiKeysError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasApiKeysService().revoke(ctx.tenant.id, id);
    void getSaasAuditService().log(ctx.tenant.id, {
      action: "delete", module: "api-keys",
      resourceId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasApiKeysError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
