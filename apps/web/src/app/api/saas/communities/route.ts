export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasCommunitiesService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const url = new URL(req.url);
    const communityId = url.searchParams.get("communityId");
    const svc = getSaasCommunitiesService();

    if (communityId) {
      if (url.searchParams.get("posts") === "true") {
        const posts = await svc.listPosts(ctx.tenant.id, communityId);
        return NextResponse.json({ posts });
      }
      const community = await svc.getCommunity(ctx.tenant.id, communityId);
      if (!community) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ community });
    }

    const communities = await svc.listCommunities(ctx.tenant.id);
    return NextResponse.json({ communities });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string | undefined;
    const svc = getSaasCommunitiesService();

    if (action === "create_post") {
      const post = await svc.createPost(
        ctx.tenant.id, String(body.communityId ?? ""),
        body as unknown as Parameters<typeof svc.createPost>[2],
      );
      return NextResponse.json({ post }, { status: 201 });
    }

    if (action === "like_post") {
      const ok = await svc.likePost(ctx.tenant.id, String(body.postId ?? ""));
      return NextResponse.json({ ok });
    }

    if (action === "pin_post") {
      const ok = await svc.pinPost(ctx.tenant.id, String(body.postId ?? ""), Boolean(body.pinned));
      return NextResponse.json({ ok });
    }

    if (action === "delete_post") {
      const ok = await svc.deletePost(ctx.tenant.id, String(body.postId ?? ""));
      if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ ok });
    }

    // Default: create community
    const community = await svc.createCommunity(
      ctx.tenant.id, body as unknown as Parameters<typeof svc.createCommunity>[1],
    );
    return NextResponse.json({ community }, { status: 201 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.write");
    const url = new URL(req.url);
    const id = url.searchParams.get("id") ?? "";
    const ok = await getSaasCommunitiesService().deleteCommunity(ctx.tenant.id, id);
    if (!ok) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
