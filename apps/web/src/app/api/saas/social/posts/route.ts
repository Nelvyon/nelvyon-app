import { NextResponse } from "next/server";
import {
  getSaasSocialService,
  SaasSocialError,
  saasErrorBody,
  saasErrorStatus,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mapError(e: SaasSocialError): NextResponse {
  const status = e.code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: e.message, code: e.code }, { status });
}

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as "meta" | null;
    const status = searchParams.get("status") as "draft" | null;
    const posts = await getSaasSocialService().listPosts(ctx.tenant.id, {
      ...(platform ? { platform } : {}),
      ...(status ? { status } : {}),
    });
    return NextResponse.json({ posts });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    const b = body as Record<string, unknown>;

    // action=publish → publish immediately
    if (b.action === "publish" && typeof b.id === "string") {
      const result = await getSaasSocialService().publishPost(ctx.tenant.id, b.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 502 });
    }

    const post = await getSaasSocialService().createPost(ctx.tenant.id, {
      socialAccountId: typeof b.social_account_id === "string" ? b.social_account_id : "",
      content: typeof b.content === "string" ? b.content : "",
      mediaUrls: Array.isArray(b.media_urls) ? (b.media_urls as string[]) : undefined,
      scheduledAt: typeof b.scheduled_at === "string" ? b.scheduled_at : undefined,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await getSaasSocialService().deletePost(ctx.tenant.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof SaasSocialError) return mapError(e);
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
