import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../backend/db/DbClient";
import { sendEmail } from "../../../../../../backend/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320;
const MAX_MESSAGE_LEN = 5_000;
const MAX_FIELD_LEN = 500;

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

    const name = body.name?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    const message = body.message?.trim() ?? "";
    if (!name || !email || !message) {
      return NextResponse.json({ error: "name, email y message son obligatorios" }, { status: 400 });
    }
    if (name.length > MAX_NAME_LEN || email.length > MAX_EMAIL_LEN || message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json({ error: "Input exceeds maximum allowed length" }, { status: 400 });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const company = body.company?.trim().slice(0, MAX_FIELD_LEN) ?? null;
    const phone = body.phone?.trim().slice(0, MAX_FIELD_LEN) ?? null;
    const plan = body.plan?.trim().slice(0, MAX_FIELD_LEN) ?? null;

    const db = DbClient.getInstance();

    await db.query(
      `INSERT INTO marketing_leads (name, email, company, phone, message, plan)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, email.toLowerCase(), company, phone, message, plan],
    );

    // Notify owner
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com";
    await sendEmail("welcome", {
      email: "danicaste2004@gmail.com",
      name: "Daniel",
      appUrl,
      subject: `🔔 Nuevo lead: ${name} <${email}>`,
    } as Record<string, string>).catch((err) => {
      console.error("[contact/route] owner notification failed", err);
    });

    // Auto-reply to lead
    await sendEmail("welcome", {
      email: email.toLowerCase(),
      name,
      appUrl,
    } as Record<string, string>).catch((err) => {
      console.error("[contact/route] lead auto-reply failed", err);
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[contact/route]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
