import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SubmissionRow {
  id: string;
  data: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
}

export async function GET(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  try {
    const { formId } = await params;
    const ctx = await requireSaasContext(req, "workflows.read");
    const db = DbClient.getInstance();

    const owns = await db.query<{ id: string }>(
      `SELECT id FROM saas_forms WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [formId, ctx.tenant.id],
    );
    if (!owns.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50") || 50, 1), 200);

    const rows = await db.query<SubmissionRow>(
      `SELECT s.id, s.data, s.ip, s.created_at AS "createdAt",
              s.contact_id AS "contactId", c.name AS "contactName", c.email AS "contactEmail"
       FROM saas_form_submissions s
       LEFT JOIN saas_contacts c ON c.id = s.contact_id
       WHERE s.form_id = $1 AND s.tenant_id = $2
       ORDER BY s.created_at DESC
       LIMIT $3`,
      [formId, ctx.tenant.id, limit],
    );

    return NextResponse.json({ submissions: rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
