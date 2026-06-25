import { type NextRequest, NextResponse } from "next/server";
import {
  getSaasBriefToLaunchService,
  SaasBriefToLaunchError,
  requireSaasContext,
} from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ launchId: string }> },
) {
  try {
    const ctx = await requireSaasContext(req, "contacts.read");
    const { launchId } = await params;
    const svc = getSaasBriefToLaunchService();
    const detail = await svc.getLaunchStatus(ctx.tenant.id, launchId);
    return NextResponse.json({ launch: detail });
  } catch (e) {
    if (e instanceof SaasBriefToLaunchError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if ((e as { status?: number }).status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[brief-to-launch/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
