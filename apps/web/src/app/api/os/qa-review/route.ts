export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  getOsQaReviewQueueService,
  OsQaReviewQueueError,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "pending" | "approved" | "rejected" | null;
    const svc = getOsQaReviewQueueService();
    const [summary, items] = await Promise.all([
      svc.getSummary(),
      svc.list(status ?? undefined),
    ]);
    return NextResponse.json({ summary, items });
  } catch (e) {
    console.error("[os/qa-review GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "review");
    const svc = getOsQaReviewQueueService();

    if (action === "enqueue") {
      const item = await svc.enqueue({
        packRunId: body.packRunId ? String(body.packRunId) : null,
        deliverableId: body.deliverableId ? String(body.deliverableId) : null,
        tenantId: body.tenantId ? String(body.tenantId) : null,
        qaScore: Number(body.qaScore ?? 0),
      });
      return NextResponse.json({ item }, { status: 201 });
    }

    const status = body.status === "rejected" ? "rejected" : "approved";
    const item = await svc.review(String(body.id ?? ""), status, body.notes ? String(body.notes) : undefined);
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof OsQaReviewQueueError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === "NOT_FOUND" ? 404 : 400 });
    }
    console.error("[os/qa-review POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
