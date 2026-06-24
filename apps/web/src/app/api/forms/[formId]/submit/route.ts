/**
 * Public form submission endpoint — no auth required.
 * Creates/upserts a CRM contact from form data and dispatches form_submitted workflow.
 */
import { NextResponse } from "next/server";
import { DbClient } from "../../../../../../../../backend/db/DbClient";
import { dispatchFormSubmitted } from "../../../../../../../../backend/saas/saasWorkflowDispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FormRow = {
  id: string;
  tenant_id: string;
  name: string;
  fields: Array<{ name: string; type: string; required?: boolean }>;
  is_active: boolean;
  honeypot_field: string;
};

type ContactUpsertRow = { id: string };

export async function POST(
  req: Request,
  { params }: { params: { formId: string } },
) {
  const db = DbClient.getInstance();
  const formId = params.formId;

  const forms = await db.query<FormRow>(
    `SELECT id, tenant_id, name, fields, is_active, honeypot_field FROM saas_forms WHERE id=$1 LIMIT 1`,
    [formId],
  );
  const form = forms[0];
  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (!form.is_active) return NextResponse.json({ error: "Form is not active" }, { status: 400 });

  let data: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  const honeypotField = form.honeypot_field || "_hp";
  if (ct.includes("application/json")) {
    try { data = (await req.json()) as Record<string, unknown>; } catch { /**/ }
  } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData().catch(() => null);
    if (fd) fd.forEach((v, k) => { data[k] = v; });
  } else {
    try { data = (await req.json()) as Record<string, unknown>; } catch { /**/ }
  }

  // Honeypot: silently discard bots that fill the hidden field
  if (data[honeypotField]) {
    return NextResponse.json({ ok: true, contactId: null }, { status: 200 });
  }

  // Validate required fields
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const missing = fields
    .filter((f) => f.required && !data[f.name])
    .map((f) => f.name);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Required fields missing: ${missing.join(", ")}` }, { status: 422 });
  }

  // Upsert contact from form data (email is the dedup key)
  let contactId: string | null = null;
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : null;
  const name = typeof data.name === "string" ? data.name.trim() : (typeof data.nombre === "string" ? data.nombre.trim() : null);
  const phone = typeof data.phone === "string" ? data.phone.trim() : (typeof data.telefono === "string" ? data.telefono.trim() : null);

  if (email || name) {
    try {
      const contactRows = await db.query<ContactUpsertRow>(
        `INSERT INTO contacts (tenant_id, name, email, phone, status, pipeline_stage, value, tags, updated_at)
         VALUES ($1,$2,$3,$4,'lead','new',0,'{}',NOW())
         ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
         DO UPDATE SET
           name = COALESCE(EXCLUDED.name, contacts.name),
           phone = COALESCE(EXCLUDED.phone, contacts.phone),
           updated_at = NOW()
         RETURNING id`,
        [form.tenant_id, name ?? email ?? "Form submission", email, phone],
      );
      contactId = contactRows[0]?.id ?? null;
    } catch {
      // Contact upsert failure must not block submission recording
    }
  }

  // Record submission
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.query(
    `INSERT INTO saas_form_submissions (form_id, tenant_id, contact_id, data, ip)
     VALUES ($1,$2,$3,$4::jsonb,$5)`,
    [formId, form.tenant_id, contactId, JSON.stringify(data), ip],
  ).catch(() => null);

  await db.query(
    `UPDATE saas_forms SET submissions = submissions + 1, updated_at = NOW() WHERE id = $1`,
    [formId],
  ).catch(() => null);

  // Dispatch workflow trigger (fire-and-forget)
  void dispatchFormSubmitted(form.tenant_id, formId, contactId, data);

  return NextResponse.json({ ok: true, contactId }, { status: 200 });
}

/** OPTIONS for CORS (embeddable forms from external sites) */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
