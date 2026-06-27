import { NextResponse } from "next/server";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { createBriefDiffRunnerPort } from "@/lib/packs/briefDiffRunnerPort";
import { getOsBriefDiffRerunService, OsBriefDiffError } from "@nelvyon/saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  let body: { sourcePackRunId?: string; intake?: Record<string, unknown>; execute?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.sourcePackRunId || typeof body.sourcePackRunId !== "string") {
    return NextResponse.json({ error: "sourcePackRunId required" }, { status: 400 });
  }
  if (!body.intake || typeof body.intake !== "object") {
    return NextResponse.json({ error: "intake required" }, { status: 400 });
  }

  const workspaceId = parseWorkspaceId(req) ?? undefined;

  try {
    const result = await getOsBriefDiffRerunService().compareAndRerun(
      {
        sourcePackRunId: body.sourcePackRunId,
        newIntake: body.intake,
        requestedBy: claims.userId,
        workspaceId,
        execute: body.execute !== false,
      },
      { userId: claims.userId, runner: createBriefDiffRunnerPort() },
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof OsBriefDiffError) {
      const status = e.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    console.error("[os/brief-diff/rerun POST]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
