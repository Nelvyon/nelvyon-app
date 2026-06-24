/**
 * Public endpoint — no auth — returns form fields for embed widget.
 * CORS open so external sites can fetch form config.
 */
import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ formId: string }> },
) {
  const { formId } = await params;
  const db = DbClient.getInstance();
  const rows = await db.query<{
    id: string;
    name: string;
    description: string | null;
    fields: unknown;
    honeypot_field: string;
    is_active: boolean;
  }>(
    `SELECT id, name, description, fields, honeypot_field, is_active
     FROM saas_forms WHERE id = $1 LIMIT 1`,
    [formId],
  );
  const form = rows[0];
  if (!form) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });
  }
  if (!form.is_active) {
    return NextResponse.json({ error: "Form inactive" }, { status: 400, headers: CORS });
  }
  return NextResponse.json(
    { id: form.id, name: form.name, description: form.description, fields: form.fields, honeypotField: form.honeypot_field },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
