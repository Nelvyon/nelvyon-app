import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_STATUSES = new Set(["scheduled", "confirmed", "completed", "cancelled", "no_show"]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.write");
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      status?: string;
      notes?: string | null;
      meetingUrl?: string | null;
      startAt?: string;
      endAt?: string;
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (body.status !== undefined) {
      if (!VALID_STATUSES.has(body.status)) {
        return NextResponse.json({ error: `status debe ser uno de: ${Array.from(VALID_STATUSES).join(", ")}` }, { status: 400 });
      }
      sets.push(`status = $${i++}`);
      values.push(body.status);
    }
    if (body.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(body.notes); }
    if (body.meetingUrl !== undefined) { sets.push(`meeting_url = $${i++}`); values.push(body.meetingUrl); }
    if (body.startAt !== undefined) { sets.push(`start_at = $${i++}`); values.push(body.startAt); }
    if (body.endAt !== undefined) { sets.push(`end_at = $${i++}`); values.push(body.endAt); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }
    sets.push(`updated_at = NOW()`);

    const db = DbClient.getInstance();
    const rows = await db.query(
      `UPDATE saas_appointments
       SET ${sets.join(", ")}
       WHERE id = $${i++} AND tenant_id = $${i++}
       RETURNING id, title, contact_name AS "contactName", contact_email AS "contactEmail",
                 contact_phone AS "contactPhone", notes, status,
                 start_at AS "startAt", end_at AS "endAt", duration_minutes AS "durationMinutes",
                 assigned_to AS "assignedTo", meeting_url AS "meetingUrl", created_at AS "createdAt"`,
      [...values, id, saasCtx.tenant.id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ appointment: rows[0] });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const saasCtx = await requireSaasContext(req, "workflows.write");
    const { id } = await ctx.params;
    const db = DbClient.getInstance();
    const rows = await db.query(
      `DELETE FROM saas_appointments WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, saasCtx.tenant.id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
