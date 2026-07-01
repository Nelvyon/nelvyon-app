import { NextResponse } from "next/server";
import {
  getSaasFormTemplatesService,
  SaasFormTemplatesError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type FormTemplateCategory,
} from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureFormsSchema() {
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS saas_forms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      fields JSONB NOT NULL DEFAULT '[]',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      submissions INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(req: Request) {
  try {
    await requireSaasContext(req, "workflows.read");
    const category = new URL(req.url).searchParams.get("category") as FormTemplateCategory | null;
    const id = new URL(req.url).searchParams.get("id");
    const svc = getSaasFormTemplatesService();
    if (id) return NextResponse.json({ template: svc.get(id) });
    const templates = svc.list(category ?? undefined);
    return NextResponse.json({ templates, total: templates.length });
  } catch (e: unknown) {
    if (e instanceof SaasFormTemplatesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    await ensureFormsSchema();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || body.action !== "import" || typeof body.template_id !== "string") {
      return NextResponse.json({ error: "action=import and template_id required" }, { status: 400 });
    }
    const result = await getSaasFormTemplatesService().importTemplate(
      ctx.tenant.id,
      body.template_id,
      typeof body.name === "string" ? body.name : undefined,
    );
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasFormTemplatesError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
