import { NextResponse } from "next/server";
import {
  getSaasWebBuilderService,
  SaasWebBuilderError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
  type CreatePageInput,
  type UpdatePageInput,
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
    const mapped = pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      type: p.type,
      status: p.status,
      views: p.views,
      customDomain: p.customDomain,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
    }));
    return NextResponse.json({ pages: mapped });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST /api/saas/web-builder
 * action="publish"       → publish page (id required)
 * action="update"        → update page metadata/sections (id required)
 * action="delete"        → delete page (id required)
 * action="render"        → return rendered HTML for preview (id required)
 * default                → create new page
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const svc = getSaasWebBuilderService();

    if (body.action === "publish") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const page = await svc.publish(ctx.tenant.id, id);
      return NextResponse.json({ page });
    }

    if (body.action === "render") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const page = await svc.get(ctx.tenant.id, id);
      if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
      const html = svc.renderHtml(page);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (body.action === "update") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const input: UpdatePageInput = {
        title: typeof body.title === "string" ? body.title : undefined,
        slug: typeof body.slug === "string" ? body.slug : undefined,
        sections: Array.isArray(body.sections) ? body.sections : undefined,
        status: typeof body.status === "string" ? body.status as UpdatePageInput["status"] : undefined,
        customDomain: typeof body.custom_domain === "string" ? body.custom_domain : (body.custom_domain === null ? null : undefined),
      };
      const page = await svc.update(ctx.tenant.id, id, input);
      return NextResponse.json({ page });
    }

    if (body.action === "delete") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      await svc.delete(ctx.tenant.id, id);
      return NextResponse.json({ ok: true });
    }

    // Create new page
    const input: CreatePageInput = {
      title: typeof body.title === "string" ? body.title : "",
      slug: typeof body.slug === "string" ? body.slug : undefined,
      type: typeof body.type === "string" ? body.type as CreatePageInput["type"] : undefined,
      sections: Array.isArray(body.sections) ? body.sections : undefined,
      customDomain: typeof body.custom_domain === "string" ? body.custom_domain : undefined,
    };
    const page = await svc.create(ctx.tenant.id, input);
    return NextResponse.json({ page }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasWebBuilderError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
