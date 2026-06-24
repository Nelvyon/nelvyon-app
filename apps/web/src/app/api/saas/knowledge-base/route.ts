export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasKbService,
  SaasKbError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";
import type { CreateArticleInput, CreateCategoryInput } from "@nelvyon/saas";

function mapErr(e: SaasKbError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : e.code === "CONFLICT" ? 409 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

/** GET /api/saas/knowledge-base
 *  ?resource=categories  → list categories
 *  ?id=uuid              → get article
 *  ?search=…&category=…&published=true → list articles
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const svc = getSaasKbService();

    if (searchParams.get("resource") === "categories") {
      const categories = await svc.listCategories(ctx.tenant.id);
      return NextResponse.json({ categories });
    }

    const id = searchParams.get("id");
    if (id) {
      const article = await svc.getArticle(ctx.tenant.id, id);
      return NextResponse.json({ article });
    }

    const search     = searchParams.get("search")     ?? undefined;
    const categoryId = searchParams.get("category_id") ?? undefined;
    const pub        = searchParams.get("published");
    const published  = pub === "true" ? true : pub === "false" ? false : undefined;

    const articles = await svc.listArticles(ctx.tenant.id, { search, categoryId, published });
    return NextResponse.json({ articles });
  } catch (e: unknown) {
    if (e instanceof SaasKbError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

/** POST /api/saas/knowledge-base
 *  action = create-category | delete-category | update | delete | vote | view
 *  default → create article
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const b = await req.json() as Record<string, unknown>;
    const action = String(b.action ?? "");
    const svc = getSaasKbService();

    if (action === "create-category") {
      const cat = await svc.createCategory(ctx.tenant.id, b as unknown as CreateCategoryInput);
      return NextResponse.json({ category: cat }, { status: 201 });
    }

    if (action === "delete-category") {
      await svc.deleteCategory(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const article = await svc.updateArticle(ctx.tenant.id, String(b.id ?? ""), {
        title:      b.title      ? String(b.title)      : undefined,
        content:    b.content    ? String(b.content)    : undefined,
        excerpt:    b.excerpt    ? String(b.excerpt)    : undefined,
        categoryId: b.categoryId !== undefined ? (b.categoryId ? String(b.categoryId) : null) : undefined,
        published:  b.published  !== undefined ? Boolean(b.published) : undefined,
      });
      return NextResponse.json({ article });
    }

    if (action === "delete") {
      await svc.deleteArticle(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    if (action === "vote") {
      const vote = String(b.vote) as "helpful" | "not_helpful";
      await svc.voteArticle(ctx.tenant.id, String(b.id ?? ""), vote);
      return NextResponse.json({ ok: true });
    }

    if (action === "view") {
      await svc.incrementViews(ctx.tenant.id, String(b.id ?? ""));
      return NextResponse.json({ ok: true });
    }

    // default: create article
    const article = await svc.createArticle(ctx.tenant.id, b as unknown as CreateArticleInput);
    return NextResponse.json({ article }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasKbError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const id = new URL(req.url).searchParams.get("id") ?? "";
    await getSaasKbService().deleteArticle(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasKbError) return mapErr(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
