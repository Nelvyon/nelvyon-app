export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  getSaasPrivateAiService,
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const status = new URL(req.url).searchParams.get("status") ?? "pending";
    const items = await getSaasPrivateAiService().listApprovals(ctx.tenant.id, status);
    return NextResponse.json({ items });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as {
      approvalId?: string;
      decision?: "approved" | "rejected";
      note?: string;
    };
    if (!body.approvalId || !body.decision) {
      return NextResponse.json({ error: "approvalId and decision required" }, { status: 400 });
    }
    const ok = await getSaasPrivateAiService().reviewApproval(
      ctx.tenant.id,
      body.approvalId,
      ctx.claims.userId,
      body.decision,
      body.note,
    );
    if (!ok) {
      return NextResponse.json({ error: "approval not found or already reviewed" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
