import { NextResponse } from "next/server";
import {
  getSaasWebBuilderService,
  SaasWebBuilderError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type CreatePageInput,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasWebBuilderError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET — list pages */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const pages = await getSaasWebBuilderService().list(ctx.tenant.id);
    const mapped = pages.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type,
      status: p.status,
      views: p.views,
      updatedAt: p.updatedAt,
    }));
    return NextResponse.json({ pages: mapped });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST — create page */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = (await req.json()) as unknown as CreatePageInput;
    const page = await getSaasWebBuilderService().create(ctx.tenant.id, body);
    return NextResponse.json({ page }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWebBuilderError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
