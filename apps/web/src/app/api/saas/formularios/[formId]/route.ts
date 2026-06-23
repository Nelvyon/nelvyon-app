import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  try {
    const { formId } = await params;
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as {
      name?: string;
      description?: string | null;
      fields?: unknown[];
      isActive?: boolean;
    };
    const db = DbClient.getInstance();
    const rows = await db.query(
      `UPDATE saas_forms SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        fields      = COALESCE($3::jsonb, fields),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 AND tenant_id = $6
      RETURNING id, name, description, fields, is_active AS "isActive",
                submissions, created_at AS "createdAt"`,
      [
        body.name?.trim() ?? null,
        body.description ?? null,
        body.fields ? JSON.stringify(body.fields) : null,
        body.isActive ?? null,
        formId,
        ctx.tenant.id,
      ],
    );
    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ form: rows[0] });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  try {
    const { formId } = await params;
    const ctx = await requireSaasContext(req, "workflows.write");
    const db = DbClient.getInstance();
    await db.query(
      `DELETE FROM saas_forms WHERE id = $1 AND tenant_id = $2`,
      [formId, ctx.tenant.id],
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
