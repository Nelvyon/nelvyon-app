import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const db = DbClient.getInstance();
    const rows = await db.query(
      `SELECT id, name, type, status, download_url AS "downloadUrl", size_bytes AS "sizeBytes", created_at AS "createdAt"
       FROM saas_reports
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [ctx.tenant.id],
    );
    return NextResponse.json({ reports: rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
