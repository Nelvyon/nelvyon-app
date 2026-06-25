/**
 * GET /api/saas/web-builder/[pageId]  → full page with sections
 * PATCH /api/saas/web-builder/[pageId] → update sections/title/seo
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasWebBuilderService,
  SaasWebBuilderError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

type RouteCtx = { params: Promise<{ pageId: string }> };

function mapError(e: SaasWebBuilderError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 500;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const [saasCtx, { pageId }] = await Promise.all([
      requireSaasContext(req, "contacts.read"),
      ctx.params,
    ]);
    const page = await getSaasWebBuilderService().get(saasCtx.tenant.id, pageId);
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const [saasCtx, { pageId }] = await Promise.all([
      requireSaasContext(req, "contacts.write"),
      ctx.params,
    ]);
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const page = await getSaasWebBuilderService().update(saasCtx.tenant.id, pageId, {
      title: typeof body.title === "string" ? body.title : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      sections: Array.isArray(body.sections) ? body.sections : undefined,
      seoTitle: typeof body.seo_title === "string" ? body.seo_title : (body.seo_title === null ? null : undefined),
      seoDescription: typeof body.seo_description === "string" ? body.seo_description : (body.seo_description === null ? null : undefined),
      customDomain: typeof body.custom_domain === "string" ? body.custom_domain : (body.custom_domain === null ? null : undefined),
    });
    return NextResponse.json({ page });
  } catch (e: unknown) {
    if (e instanceof SaasWebBuilderError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
