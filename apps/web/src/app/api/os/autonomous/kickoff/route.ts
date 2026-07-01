export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { getOsPremiumAutonomousService } from "@nelvyon/saas";

export async function GET() {
  const services = getOsPremiumAutonomousService().listServiceIds();
  return NextResponse.json({ count: services.length, services });
}

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceHeader = req.headers.get("x-workspace-id");
  const workspaceId = workspaceHeader ? Number(workspaceHeader) : 0;
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const svc = getOsPremiumAutonomousService();
  const serviceId = body.serviceId ? String(body.serviceId) : null;
  const tenantId = String(body.tenantId ?? "");

  if (serviceId) {
    const result = await svc.queueAutonomousRun({
      tenantId,
      serviceId,
      workspaceId,
      intake: (body.intake ?? {}) as Record<string, unknown>,
      userId: claims.userId,
    });
    return NextResponse.json(result, { status: 201 });
  }

  const results = await svc.enqueueAll({
    tenantId,
    workspaceId,
    intake: (body.intake ?? {}) as Record<string, unknown>,
    userId: claims.userId,
  });
  return NextResponse.json({ queued: results.filter((r) => r.status === "queued").length, results }, { status: 201 });
}
