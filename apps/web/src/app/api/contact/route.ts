import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../backend/db/DbClient";
import { sendEmail } from "../../../../../../backend/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureSchema() {
  const db = DbClient.getInstance();
  await db.query(`
    CREATE TABLE IF NOT EXISTS marketing_leads (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      company    TEXT,
      phone      TEXT,
      message    TEXT NOT NULL,
      plan       TEXT,
      source     TEXT DEFAULT 'contact-form',
      status     TEXT NOT NULL DEFAULT 'new',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      email?: string;
      company?: string;
      phone?: string;
      message?: string;
      plan?: string;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: "name, email y message son obligatorios" }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    await ensureSchema();
    const db = DbClient.getInstance();

    await db.query(
      `INSERT INTO marketing_leads (name, email, company, phone, message, plan)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.company?.trim() ?? null,
        body.phone?.trim() ?? null,
        body.message.trim(),
        body.plan?.trim() ?? null,
      ],
    );

    // Notify owner
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
    await sendEmail("welcome", {
      email: "danicaste2004@gmail.com",
      name: "Daniel",
      appUrl,
      // Reuse welcome template for internal notification — override subject via custom fields
      subject: `🔔 Nuevo lead: ${body.name} <${body.email}>`,
    } as Record<string, string>).catch(() => {});

    // Auto-reply to lead
    await sendEmail("welcome", {
      email: body.email.trim(),
      name: body.name.trim(),
      appUrl,
    } as Record<string, string>).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[contact/route]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
