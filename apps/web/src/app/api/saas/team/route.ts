import { NextResponse } from "next/server";
import {
  getSaasTeamService,
  SaasTeamError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type TeamMemberRole,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasTeamError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const members = await getSaasTeamService().list(ctx.tenant.id);
    return NextResponse.json({ members });
  } catch (e: unknown) {
    if (e instanceof SaasTeamError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    const member = await getSaasTeamService().invite(ctx.tenant.id, {
      email: typeof b.email === "string" ? b.email : "",
      name: typeof b.name === "string" ? b.name : null,
      role: typeof b.role === "string" ? (b.role as TeamMemberRole) : "user",
    });
    return NextResponse.json({ member }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasTeamError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;
    if (typeof b.id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    const svc = getSaasTeamService();
    if (b.action === "suspend") {
      const member = await svc.suspend(ctx.tenant.id, b.id);
      return NextResponse.json({ member });
    }
    if (typeof b.role === "string") {
      const member = await svc.updateRole(ctx.tenant.id, b.id, b.role as TeamMemberRole);
      return NextResponse.json({ member });
    }
    return NextResponse.json({ error: "Missing action or role" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasTeamError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasTeamService().remove(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasTeamError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
