import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  parseWorkspaceHeader,
  assertUserCanAccessWorkspace,
  WorkspaceAccessError,
} from "@/lib/platformDbFallback";
import { getOsDeliveryCertificateService, OsDeliveryCertError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  const workspaceId = parseWorkspaceHeader(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id required" }, { status: 400 });
  }
  try {
    await assertUserCanAccessWorkspace(claims, workspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
  }

  try {
    const { id } = await ctx.params;
    const cert = await getOsDeliveryCertificateService().getCertificate(id, { workspaceId });
    return NextResponse.json({ certificate: cert });
  } catch (e) {
    if (e instanceof OsDeliveryCertError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 404 });
    }
    console.error("[os/certificates/[id] GET]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
