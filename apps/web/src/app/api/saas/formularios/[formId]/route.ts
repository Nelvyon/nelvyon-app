import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { formId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as {
      name?: string;
      description?: string | null;
      fields?: unknown[];
      isActive?: boolean;
    };
    const db = getDb();
    const rows = await db.execute(sql`
      UPDATE saas_forms SET
        name        = COALESCE(${body.name?.trim() ?? null}, name),
        description = COALESCE(${body.description ?? null}, description),
        fields      = COALESCE(${body.fields ? JSON.stringify(body.fields) + '::jsonb' : null}, fields),
        is_active   = COALESCE(${body.isActive ?? null}, is_active),
        updated_at  = NOW()
      WHERE id = ${params.formId} AND tenant_id = ${ctx.tenant.id}
      RETURNING id, name, description, fields, is_active AS "isActive",
                submissions, created_at AS "createdAt"
    `);
    if (!rows.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ form: rows.rows[0] });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, { params }: { params: { formId: string } }) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const db = getDb();
    await db.execute(sql`
      DELETE FROM saas_forms WHERE id = ${params.formId} AND tenant_id = ${ctx.tenant.id}
    `);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
