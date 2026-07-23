import { NextResponse } from "next/server";

import { getPackMeta, resolveKickoffPackId } from "@/lib/packs/packRegistry";
import { requirePlatformClaims } from "@/lib/platformBffAuth";
import {
  assertUserCanAccessWorkspace,
  platformDbFallbackEnabled,
  WorkspaceAccessError,
} from "@/lib/platformDbFallback";
import { isPackLlmEnvConfigured } from "@nelvyon/saas";
import { RUNNERS } from "./runnersMap";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Mesh/Ollama 8B packs routinely exceed 120s; Railway Pro allows up to 300s. */
export const maxDuration = 300;

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
  const { packId: rawPackId } = await ctx.params;
  const resolvedId = resolveKickoffPackId(rawPackId);
  const meta = resolvedId ? getPackMeta(resolvedId) : getPackMeta(rawPackId);
  const runner = resolvedId ? RUNNERS[resolvedId] : undefined;

  if (!meta || !runner) {
    return NextResponse.json({ error: `Pack desconocido: ${rawPackId}` }, { status: 404 });
  }

  const claims = await requirePlatformClaims(req);
  if (claims instanceof NextResponse) return claims;

  if (!platformDbFallbackEnabled()) {
    return NextResponse.json(
      { error: "Growth Pack requiere DATABASE_URL en el entorno web", code: "DATABASE_URL_MISSING" },
      { status: 503 },
    );
  }

  // Production autonomous runs must have an LLM path configured (OpenAI or local Ollama).
  // Local/dev without AUTONOMOUS_PRODUCTION may still dry-run templates.
  if (process.env.AUTONOMOUS_PRODUCTION === "true" && !isPackLlmEnvConfigured()) {
    return NextResponse.json(
      {
        error:
          "Pack LLM no configurado: define OPENAI_API_KEY o OLLAMA_HOST / NELVYON_LOCAL_AI_URL antes de kickoff en producción autónoma.",
        code: "LLM_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const workspaceId = parseWorkspaceId(req);
  if (!workspaceId) {
    return NextResponse.json({ error: "X-Workspace-Id header required" }, { status: 400 });
  }

  try {
    await assertUserCanAccessWorkspace(claims, workspaceId);
  } catch (e) {
    if (e instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw e;
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
    const idempotencyKey =
      req.headers.get("idempotency-key")?.trim().slice(0, 128) ||
      req.headers.get("x-idempotency-key")?.trim().slice(0, 128) ||
      undefined;

    if (idempotencyKey) {
      const { findPackRunByIdempotencyKey } = await import("@/lib/packs/packRunStore");
      const existing = await findPackRunByIdempotencyKey(workspaceId, idempotencyKey);
      if (existing) {
        return NextResponse.json(existing, {
          status: 200,
          headers: { "X-Idempotent-Replay": "true" },
        });
      }
    }

    // Default async: mesh/Ollama packs exceed HTTP/gateway limits if awaited.
    // Opt into sync with X-Pack-Sync: 1 or NELVYON_PACK_KICKOFF_ASYNC=0.
    const syncMode =
      req.headers.get("x-pack-sync")?.trim() === "1" ||
      process.env.NELVYON_PACK_KICKOFF_ASYNC?.trim() === "0";

    if (syncMode) {
      const run = await runner.run({
        workspaceId,
        userId: claims.userId,
        intake: intake as never,
        idempotencyKey,
      });
      return NextResponse.json(run, { status: 201 });
    }

    const createdBox: { run: import("@/lib/packs/types").PackRunRecord | null } = { run: null };
    const work = runner.run({
      workspaceId,
      userId: claims.userId,
      intake: intake as never,
      idempotencyKey,
      onRunCreated: (run) => {
        createdBox.run = run;
      },
    });

    const createDeadline = Date.now() + 20_000;
    while (!createdBox.run && Date.now() < createDeadline) {
      const raced = await Promise.race([
        work.then((run) => ({ kind: "done" as const, run })),
        new Promise<{ kind: "tick" }>((resolve) => {
          setTimeout(() => resolve({ kind: "tick" }), 40);
        }),
      ]);
      if (raced.kind === "done") {
        return NextResponse.json(raced.run, { status: 201 });
      }
    }

    if (!createdBox.run) {
      // Create should be near-instant; if not, await fully (fail closed with error).
      const run = await work;
      return NextResponse.json(run, { status: 201 });
    }

    const runId = createdBox.run.id;
    void work.catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : "Pack async execution failed";
      console.error(`[pack-kickoff-async] run=${runId} failed:`, message);
      try {
        const { updatePackRun } = await import("@/lib/packs/packRunStore");
        await updatePackRun(
          runId,
          { status: "failed", error_message: message.slice(0, 2000) },
          workspaceId,
        );
      } catch (updateErr) {
        console.error(`[pack-kickoff-async] run=${runId} status update failed:`, updateErr);
      }
    });

    return NextResponse.json(createdBox.run, {
      status: 202,
      headers: { "X-Pack-Async": "1" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Pack execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
