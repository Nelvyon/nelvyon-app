export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  requireSaasContext,
  saasErrorBody,
  saasErrorStatus,
  getSaasAuditService,
} from "@nelvyon/saas";

const DEFAULT_RETENTION_DAYS = 90;

export async function GET(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "audit.read");
    const url = new URL(req.url);
    const svc = getSaasAuditService();

    const action = url.searchParams.get("action");
    if (action === "stats") {
      const stats = await svc.getModuleStats(ctx.tenant.id);
      return NextResponse.json({ stats });
    }

    const filters = {
      module: url.searchParams.get("module")        ?? undefined,
      userId: url.searchParams.get("userId")        ?? undefined,
      action: url.searchParams.get("action_filter") ?? undefined,
      from:   url.searchParams.get("from")          ?? undefined,
      to:     url.searchParams.get("to")            ?? undefined,
      limit:  url.searchParams.get("limit")  ? Number(url.searchParams.get("limit"))  : 50,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
    };

    // CSV export
    if (url.searchParams.get("format") === "csv") {
      const csv = await svc.exportCsv(ctx.tenant.id, filters);
      return new Response(csv, {
        headers: {
          "Content-Type":        "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-${ctx.tenant.id}-${Date.now()}.csv"`,
        },
      });
    }

    const [entries, total] = await Promise.all([
      svc.list(ctx.tenant.id, filters),
      svc.getTotal(ctx.tenant.id, filters),
    ]);
    return NextResponse.json({ entries, total });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}

export async function POST(req: Request) {
  try {
    const ctx    = await requireSaasContext(req, "settings.write");
    const body   = await req.json() as Record<string, unknown>;
    const action = String(body.action ?? "log");

    if (action === "purge") {
      const days = Number(body.days ?? DEFAULT_RETENTION_DAYS);
      const deleted = await getSaasAuditService().purgeOlderThan(ctx.tenant.id, days);
      return NextResponse.json({ ok: true, deleted });
    }

    // Fallback: manual log entry (internal use)
    const svc = getSaasAuditService();
    await svc.log(ctx.tenant.id, {
      userEmail: ctx.claims.userId,
      action:    String(body.action ?? "view"),
      module:    String(body.module ?? "settings"),
      details:   typeof body.details === "object" && body.details !== null
        ? (body.details as Record<string, unknown>) : {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
