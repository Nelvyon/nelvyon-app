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
    return NextResponse.json({ pages });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/**
 * POST /api/saas/web-builder
 * action missing → create
 * action="publish"               → publish page v2
 * action="unpublish"             → back to draft
 * action="render"                → return rendered HTML
 * action="update"                → update metadata/sections
 * action="delete"                → delete page
 * action="add-section"           → add section to page
 * action="delete-section"        → remove section
 * action="duplicate-section"     → clone section
 * action="reorder-sections"      → reorder by ID array
 * action="save-version"          → snapshot current sections
 * action="list-versions"         → list version snapshots
 * action="restore-version"       → restore a snapshot
 * action="verify-domain"         → DNS CNAME check
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const svc = getSaasWebBuilderService();
    const tenantId = ctx.tenant.id;

    const id = typeof body.id === "string" ? body.id : "";

    // ── Create (no action) ───────────────────────────────────────────────────
    if (!body.action) {
      const input: CreatePageInput = {
        title: typeof body.title === "string" ? body.title : "",
        slug: typeof body.slug === "string" ? body.slug : undefined,
        type: typeof body.type === "string" ? body.type as CreatePageInput["type"] : undefined,
        sections: Array.isArray(body.sections) ? body.sections : undefined,
        customDomain: typeof body.custom_domain === "string" ? body.custom_domain : undefined,
        seoTitle: typeof body.seo_title === "string" ? body.seo_title : undefined,
        seoDescription: typeof body.seo_description === "string" ? body.seo_description : undefined,
      };
      const page = await svc.create(tenantId, input);
      return NextResponse.json({ page }, { status: 201 });
    }

    // ── Require id for most actions ──────────────────────────────────────────
    if (body.action !== "list-versions" && body.action !== "import-template" && !id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    switch (body.action) {
      case "publish": {
        const page = await svc.publish(tenantId, id);
        return NextResponse.json({ page });
      }
      case "unpublish": {
        const page = await svc.unpublish(tenantId, id);
        return NextResponse.json({ page });
      }
      case "render": {
        const page = await svc.get(tenantId, id);
        if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
        const html = svc.renderHtml(page);
        return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      case "update": {
        const page = await svc.update(tenantId, id, {
          title: typeof body.title === "string" ? body.title : undefined,
          slug: typeof body.slug === "string" ? body.slug : undefined,
          sections: Array.isArray(body.sections) ? body.sections : undefined,
          status: typeof body.status === "string" ? body.status as "draft" | "published" | "archived" : undefined,
          customDomain: typeof body.custom_domain === "string" ? body.custom_domain : (body.custom_domain === null ? null : undefined),
          seoTitle: typeof body.seo_title === "string" ? body.seo_title : undefined,
          seoDescription: typeof body.seo_description === "string" ? body.seo_description : undefined,
        });
        return NextResponse.json({ page });
      }
      case "delete": {
        await svc.delete(tenantId, id);
        return NextResponse.json({ ok: true });
      }
      case "add-section": {
        const type = typeof body.section_type === "string" ? body.section_type : "text";
        const page = await svc.addSection(tenantId, id, {
          type: type as import("@nelvyon/saas").SectionType,
          content: typeof body.content === "object" && body.content !== null
            ? (body.content as Record<string, unknown>) : undefined,
          atIndex: typeof body.at_index === "number" ? body.at_index : undefined,
        });
        return NextResponse.json({ page });
      }
      case "delete-section": {
        const sectionId = typeof body.section_id === "string" ? body.section_id : "";
        if (!sectionId) return NextResponse.json({ error: "section_id required" }, { status: 400 });
        const page = await svc.deleteSection(tenantId, id, sectionId);
        return NextResponse.json({ page });
      }
      case "duplicate-section": {
        const sectionId = typeof body.section_id === "string" ? body.section_id : "";
        if (!sectionId) return NextResponse.json({ error: "section_id required" }, { status: 400 });
        const page = await svc.duplicateSection(tenantId, id, sectionId);
        return NextResponse.json({ page });
      }
      case "reorder-sections": {
        const orderedIds = Array.isArray(body.ordered_ids) ? (body.ordered_ids as string[]) : [];
        if (!orderedIds.length) return NextResponse.json({ error: "ordered_ids required" }, { status: 400 });
        const page = await svc.reorderSections(tenantId, id, orderedIds);
        return NextResponse.json({ page });
      }
      case "save-version": {
        const version = await svc.saveVersion(tenantId, id);
        return NextResponse.json({ version });
      }
      case "list-versions": {
        const versions = await svc.listVersions(tenantId, id);
        return NextResponse.json({ versions });
      }
      case "restore-version": {
        const versionId = typeof body.version_id === "string" ? body.version_id : "";
        if (!versionId) return NextResponse.json({ error: "version_id required" }, { status: 400 });
        const page = await svc.restoreVersion(tenantId, id, versionId);
        return NextResponse.json({ page });
      }
      case "verify-domain": {
        const result = await svc.verifyCustomDomain(tenantId, id);
        return NextResponse.json(result);
      }
      case "import-template": {
        const templateId = typeof body.template_id === "string" ? body.template_id : "";
        if (!templateId) return NextResponse.json({ error: "template_id required" }, { status: 400 });
        const companyName = typeof body.company_name === "string" ? body.company_name : ctx.tenant.companyName ?? undefined;
        const page = await svc.createFromFeaturedTemplate(tenantId, templateId, companyName);
        return NextResponse.json({ page }, { status: 201 });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${String(body.action)}` }, { status: 400 });
    }
  } catch (e: unknown) {
    if (e instanceof SaasWebBuilderError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
