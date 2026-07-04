import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    const db = DbClient.getInstance();
    const rows = await db.query(
      `SELECT id, name, description, fields, is_active AS "isActive",
              submissions, created_at AS "createdAt"
       FROM saas_forms
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [ctx.tenant.id],
    );
    return NextResponse.json({ forms: rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as {
      name: string;
      description?: string | null;
      fields: unknown[];
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const db = DbClient.getInstance();
    const rows = await db.query(
      `INSERT INTO saas_forms (tenant_id, name, description, fields)
       VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, name, description, fields, is_active AS "isActive",
                 submissions, created_at AS "createdAt"`,
      [ctx.tenant.id, body.name.trim(), body.description ?? null, JSON.stringify(body.fields ?? [])],
    );
    return NextResponse.json({ form: rows[0] }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
