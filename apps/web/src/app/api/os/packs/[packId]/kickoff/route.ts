import { NextResponse } from "next/server";

import { getPackMeta } from "@/lib/packs/packRegistry";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import { platformDbFallbackEnabled } from "@/lib/platformDbFallback";
import { RUNNERS } from "./runnersMap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseWorkspaceId(req: Request): number | null {
  const raw = req.headers.get("x-workspace-id")?.trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ packId: string }> },
) {
  const { packId } = await ctx.params;
  const meta = getPackMeta(packId);
  const runner = RUNNERS[packId] ?? (meta ? RUNNERS[meta.id] : undefined);

  if (!meta || !runner) {
    return NextResponse.json({ error: `Pack desconocido: ${packId}` }, { status: 404 });
  }

  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json(
      { error: "Growth Pack requiere DATABASE_URL en el entorno web" },
      { status: 503 },
    );
  }

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intake = runner.validate(body);
  if (!intake) {
    return NextResponse.json(
      { error: `Brief inválido para ${meta.name}. Revisa los campos obligatorios.` },
      { status: 400 },
    );
  }

  try {
    const run = await runner.run({
      workspaceId,
      userId: claims.userId,
      intake: intake as never,
    });
    return NextResponse.json(run, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Pack execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
