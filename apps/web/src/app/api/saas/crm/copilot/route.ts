export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasCrmCopilotService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const body = (await req.json()) as Record<string, unknown>;
    const contactId = String(body.contactId ?? "");
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });
    const suggestion = await getSaasCrmCopilotService().suggestForContact(ctx.tenant.id, contactId);
    return NextResponse.json({ suggestion });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
