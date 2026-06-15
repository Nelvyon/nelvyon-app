import { NextResponse } from "next/server";

import { buildPartnerHqSummary, type PartnerClientRow } from "@/lib/partners/partnerHqSummary";
import { listPackRunsForWorkspaces } from "@/lib/packs/packRunStore";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { proxyPlatformFetch } from "@/lib/platformFastApiProxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function fetchJsonUpstream(req: Request, path: string): Promise<Record<string, unknown> | null> {
  try {
    const upstream = await proxyPlatformFetch(req, "GET", path);
    if (!upstream.ok) return null;
    return (await upstream.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapClients(payload: Record<string, unknown> | null): PartnerClientRow[] {
  const rawClients = (payload?.clients as Record<string, unknown>[] | undefined) ?? [];
  return rawClients
    .map((c) => ({
      client_workspace_id: Number(c.client_workspace_id),
      client_name: String(c.client_name ?? c.workspace_name ?? "Cliente"),
      admin_email: c.admin_email != null ? String(c.admin_email) : undefined,
      status: c.status != null ? String(c.status) : "active",
      plan_id: "starter",
    }))
    .filter((c) => Number.isFinite(c.client_workspace_id));
}

export async function GET(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  const [clientsPayload, affiliatePayload] = await Promise.all([
    fetchJsonUpstream(req, "/api/whitelabel/clients"),
    fetchJsonUpstream(req, "/api/affiliates/stats"),
  ]);

  const clients = mapClients(clientsPayload);
  const workspaceIds = [workspaceId, ...clients.map((c) => c.client_workspace_id)];

  let packRuns: Awaited<ReturnType<typeof listPackRunsForWorkspaces>> = [];
  try {
    packRuns = await listPackRunsForWorkspaces(workspaceIds, 80);
  } catch {
    packRuns = [];
  }

  const summary = buildPartnerHqSummary({
    clients,
    packRuns,
    affiliateStats: affiliatePayload,
  });

  return NextResponse.json({
    ...summary,
    partner_user_id: claims.userId,
    workspace_id: workspaceId,
    degraded: packRuns.length === 0 && workspaceIds.length > 0,
  });
}
