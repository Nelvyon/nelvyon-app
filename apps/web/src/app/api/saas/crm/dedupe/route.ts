import { NextResponse } from "next/server";

import {
  getSaasCrmDedupeService,
  SaasCrmDedupeError,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasCrmDedupeError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/crm/dedupe — scan duplicate contact groups */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const groups = await getSaasCrmDedupeService().scanDuplicates(ctx.tenant.id);
    return NextResponse.json({ groups, total: groups.length });
  } catch (e: unknown) {
    if (e instanceof SaasCrmDedupeError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/crm/dedupe — merge duplicates into keepId */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as { keepId?: string; mergeIds?: string[] };
    const keepId = String(body.keepId ?? "").trim();
    const mergeIds = Array.isArray(body.mergeIds) ? body.mergeIds.map(String) : [];
    if (!keepId || mergeIds.length === 0) {
      return NextResponse.json({ error: "keepId and mergeIds required" }, { status: 400 });
    }
    const contact = await getSaasCrmDedupeService().mergeContacts(ctx.tenant.id, keepId, mergeIds);
    return NextResponse.json({ contact });
  } catch (e: unknown) {
    if (e instanceof SaasCrmDedupeError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
