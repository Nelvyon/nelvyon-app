import { NextResponse } from "next/server";
import {
  getSaasFunnelTemplatesService,
  SaasFunnelTemplatesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "contacts.read");
    const category = new URL(req.url).searchParams.get("category") as "local" | "ecommerce" | "saas" | "lead-gen" | null;
    const id = new URL(req.url).searchParams.get("id");
    const svc = getSaasFunnelTemplatesService();
    if (id) return NextResponse.json({ template: svc.get(id) });
    const templates = svc.list(category ?? undefined);
    return NextResponse.json({ templates, total: templates.length });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelTemplatesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || body.action !== "import" || typeof body.template_id !== "string") {
      return NextResponse.json({ error: "action=import and template_id required" }, { status: 400 });
    }
    const result = await getSaasFunnelTemplatesService().importTemplate(
      ctx.tenant.id,
      body.template_id,
      typeof body.name === "string" ? body.name : undefined,
    );
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasFunnelTemplatesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
