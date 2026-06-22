import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureSchema() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_appointments (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id         TEXT NOT NULL,
      title             TEXT NOT NULL,
      contact_name      TEXT NOT NULL,
      contact_email     TEXT NOT NULL,
      contact_phone     TEXT,
      notes             TEXT,
      status            TEXT NOT NULL DEFAULT 'scheduled',
      start_at          TIMESTAMPTZ NOT NULL,
      end_at            TIMESTAMPTZ NOT NULL,
      duration_minutes  INTEGER NOT NULL DEFAULT 30,
      assigned_to       TEXT,
      meeting_url       TEXT,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.read");
    await ensureSchema();
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500);
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT
        id,
        title,
        contact_name      AS "contactName",
        contact_email     AS "contactEmail",
        contact_phone     AS "contactPhone",
        notes,
        status,
        start_at          AS "startAt",
        end_at            AS "endAt",
        duration_minutes  AS "durationMinutes",
        assigned_to       AS "assignedTo",
        meeting_url       AS "meetingUrl",
        created_at        AS "createdAt"
      FROM saas_appointments
      WHERE tenant_id = ${ctx.tenant.id}
      ORDER BY start_at ASC
      LIMIT ${limit}
    `);
    return NextResponse.json({ appointments: rows.rows });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.write");
    const body = (await req.json()) as {
      title: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      notes?: string | null;
      startAt: string;
      endAt: string;
      durationMinutes?: number;
      assignedTo?: string | null;
      meetingUrl?: string | null;
    };
    if (!body.title?.trim() || !body.contactEmail?.trim() || !body.startAt) {
      return NextResponse.json({ error: "title, contactEmail and startAt are required" }, { status: 400 });
    }
    await ensureSchema();
    const db = getDb();
    const rows = await db.execute(sql`
      INSERT INTO saas_appointments (
        tenant_id, title, contact_name, contact_email, contact_phone,
        notes, start_at, end_at, duration_minutes, assigned_to, meeting_url
      ) VALUES (
        ${ctx.tenant.id},
        ${body.title.trim()},
        ${body.contactName?.trim() ?? ""},
        ${body.contactEmail.trim()},
        ${body.contactPhone ?? null},
        ${body.notes ?? null},
        ${body.startAt},
        ${body.endAt},
        ${body.durationMinutes ?? 30},
        ${body.assignedTo ?? null},
        ${body.meetingUrl ?? null}
      )
      RETURNING id, title, contact_name AS "contactName", contact_email AS "contactEmail",
                status, start_at AS "startAt", end_at AS "endAt",
                duration_minutes AS "durationMinutes", created_at AS "createdAt"
    `);
    return NextResponse.json({ appointment: rows.rows[0] }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
