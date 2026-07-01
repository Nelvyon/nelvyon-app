export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  saasGdprService,
} from "@nelvyon/saas";

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.read");
    const url = new URL(req.url);
    if (url.searchParams.get("scope") === "tenant") {
      const bundle = await saasGdprService.exportTenantBundle(ctx.tenant.id);
      return NextResponse.json(bundle);
    }
    const data = await saasGdprService.exportUserData(ctx.claims.userId, ctx.tenant.id);
    const requests = await saasGdprService.getRequests(ctx.claims.userId);
    return NextResponse.json({ data, requests });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "settings.write");
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "request-export");

    if (action === "request-export") {
      const reqRow = await saasGdprService.requestExport(ctx.claims.userId, ctx.tenant.id);
      return NextResponse.json({ request: reqRow }, { status: 201 });
    }
    if (action === "request-deletion") {
      const reqRow = await saasGdprService.requestDeletion(ctx.claims.userId, ctx.tenant.id);
      return NextResponse.json({ request: reqRow }, { status: 201 });
    }
    if (action === "delete-user-data") {
      await saasGdprService.deleteUserData(ctx.claims.userId, ctx.tenant.id);
      return NextResponse.json({ ok: true });
    }
    if (action === "delete-contact") {
      await saasGdprService.deleteContactById(ctx.tenant.id, String(body.contactId ?? ""));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
