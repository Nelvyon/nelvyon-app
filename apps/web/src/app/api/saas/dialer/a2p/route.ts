export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasTwilioA2pService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const registrations = await getSaasTwilioA2pService().list(ctx.tenant.id);
    return NextResponse.json({ registrations });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as Record<string, unknown>;
    const reg = await getSaasTwilioA2pService().createDraft(ctx.tenant.id, {
      businessName: String(body.businessName ?? ""),
      ein: body.ein ? String(body.ein) : undefined,
      useCase: body.useCase ? String(body.useCase) : undefined,
    });
    return NextResponse.json({ registration: reg }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
