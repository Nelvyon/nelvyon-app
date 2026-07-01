import { NextResponse } from "next/server";
import {
  getSaasSequenceTemplatesService,
  SaasSequenceTemplatesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type SequenceTemplateCategory,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSequenceTemplatesError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "workflows.read");
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as SequenceTemplateCategory | null;
    const id = searchParams.get("id");
    const svc = getSaasSequenceTemplatesService();

    if (id) {
      return NextResponse.json({ template: svc.get(id) });
    }

    const templates = svc.list(category ?? undefined);
    return NextResponse.json({ templates, total: templates.length });
  } catch (e: unknown) {
    if (e instanceof SaasSequenceTemplatesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    if (b.action === "import" && typeof b.template_id === "string") {
      const result = await getSaasSequenceTemplatesService().importTemplate(
        ctx.tenant.id,
        b.template_id,
        typeof b.name === "string" ? b.name : undefined,
      );
      return NextResponse.json({ ok: true, ...result }, { status: 201 });
    }

    return NextResponse.json({ error: "action must be 'import' with template_id" }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof SaasSequenceTemplatesError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
