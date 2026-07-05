import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { notFoundResponse, packRunBelongsToWorkspace, requireOsWorkspaceAccess } from "@/lib/osWorkspaceScope";
import { getOsAgentAuditTrailService } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { packRunId, sku } — verify trail events exist for a SKU (integrity check). */
export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const ws = await requireOsWorkspaceAccess(req, claims);
  if (ws instanceof NextResponse) return ws;
  const { workspaceId } = ws;

  try {
    const body = (await req.json().catch(() => ({}))) as { packRunId?: string; sku?: string };
    if (!body.packRunId?.trim()) {
      return NextResponse.json({ error: "packRunId requerido", code: "VALIDATION" }, { status: 400 });
    }
    if (!(await packRunBelongsToWorkspace(body.packRunId.trim(), workspaceId))) {
      return notFoundResponse();
    }
    const events = await getOsAgentAuditTrailService().listEvents({
      packRunId: body.packRunId.trim(),
      sku: body.sku ?? undefined,
      workspaceId,
      limit: 500,
    });
    if (events.length === 0) {
      return NextResponse.json({ ok: false, count: 0 }, { status: 404 });
    }
    return NextResponse.json({ ok: true, count: events.length });
  } catch (e) {
    console.error("[os/agent-audit/replay-check POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
