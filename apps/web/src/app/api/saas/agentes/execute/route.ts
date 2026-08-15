import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";
import { runNelvyonTextTask } from "../../../../../../../../backend/saas/NelvyonAiTextService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const MAX_AGENT_ID_LEN = 128;
const MAX_INPUT_LEN = 50_000;

async function persistAgentRunUpdate(
  db: DbClient,
  runId: string,
  tenantId: string,
  output: string,
  status: string,
): Promise<void> {
  try {
    await db.query(
      `UPDATE saas_agent_runs SET output = $1, status = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`,
      [output, status, runId, tenantId],
    );
  } catch (err) {
    console.error("[saas/agentes/execute] failed to persist run update", { runId, tenantId, status, err });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as { agentId?: string; input?: string };

    const agentId = body.agentId?.trim() ?? "";
    const input = body.input?.trim() ?? "";
    if (!agentId || !input) {
      return NextResponse.json({ error: "agentId and input are required" }, { status: 400 });
    }
    if (agentId.length > MAX_AGENT_ID_LEN) {
      return NextResponse.json({ error: `agentId must be at most ${MAX_AGENT_ID_LEN} characters` }, { status: 400 });
    }
    if (input.length > MAX_INPUT_LEN) {
      return NextResponse.json({ error: `input must be at most ${MAX_INPUT_LEN} characters` }, { status: 400 });
    }

    const db = DbClient.getInstance();
    const runRows = await db.query<{ id: string }>(
      `INSERT INTO saas_agent_runs (tenant_id, agent_id, input, status)
       VALUES ($1, $2, $3, 'running')
       RETURNING id`,
      [ctx.tenant.id, agentId, input],
    );
    const runId = runRows[0]?.id;
    if (!runId) {
      return NextResponse.json({ error: "Failed to create agent run" }, { status: 500 });
    }

    // Try to call Python backend agent
    let result = "";
    let status = "completed";

    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/v1/os/agents/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          input,
          tenant_id: ctx.tenant.id,
          dry_run: false,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (backendRes.ok) {
        const data = (await backendRes.json()) as { result?: string; output?: string; content?: string };
        result = data.result ?? data.output ?? data.content ?? JSON.stringify(data);
      } else {
        const err = (await backendRes.json().catch(() => ({}))) as { detail?: string };
        throw new Error(err.detail ?? `Backend returned ${backendRes.status}`);
      }
    } catch (_backendErr) {
      /**
       * Respaldo con la IA PROPIA de NELVYON. Antes este camino llamaba a
       * `api.openai.com` con la clave del entorno, lo que convertía un fallo del
       * backend de agentes en gasto por tokens de un tercero y, sin clave,
       * en el mensaje "Verifica la clave OPENAI_API_KEY en Railway".
       * Ahora usa `LocalModelRouter` con el `tenantId` autenticado.
       */
      const ai = await runNelvyonTextTask({
        tenantId: String(ctx.tenant.id),
        system: `Eres el agente especializado de Nelvyon para el sector "${agentId}". Eres un experto en marketing digital, SEO, publicidad y crecimiento. Responde de forma estructurada, accionable y en español. Da resultados concretos que el usuario pueda implementar hoy mismo.`,
        prompt: input,
        agentId: `saas-agent-${agentId}`,
      });
      if (ai.ok) {
        result = ai.content;
      } else {
        status = "failed";
        result = "";
      }
    }

    if (status === "failed" && !result.trim()) {
      await persistAgentRunUpdate(db, runId, ctx.tenant.id, "Agent execution unavailable", "failed");

      return NextResponse.json(
        {
          error:
            "Agente no disponible: el backend de agentes y la IA local de NELVYON no respondieron.",
          code: "AGENT_UNAVAILABLE",
          runId,
          status: "failed",
        },
        { status: 503 },
      );
    }

    if (status === "failed") {
      await persistAgentRunUpdate(db, runId, ctx.tenant.id, result, status);

      return NextResponse.json(
        {
          error: result,
          code: "AGENT_FAILED",
          runId,
          status: "failed",
        },
        { status: 503 },
      );
    }

    await persistAgentRunUpdate(db, runId, ctx.tenant.id, result, status);

    return NextResponse.json({
      result,
      runId,
      status,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
