import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

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
      // Fallback: use OpenAI directly with agent context
      const openaiKey = process.env.OPENAI_API_KEY;
      if (openaiKey) {
        const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Eres el agente especializado de Nelvyon para el sector "${agentId}". Eres un experto en marketing digital, SEO, publicidad y crecimiento. Responde de forma estructurada, accionable y en español. Da resultados concretos que el usuario pueda implementar hoy mismo.`,
              },
              { role: "user", content: input },
            ],
            max_tokens: 2000,
            temperature: 0.7,
          }),
          signal: AbortSignal.timeout(30_000),
        });
        if (oaRes.ok) {
          const oaData = (await oaRes.json()) as { choices?: { message?: { content?: string } }[] };
          result = oaData.choices?.[0]?.message?.content ?? "Sin respuesta del agente";
        } else {
          status = "failed";
          result = `El agente "${agentId}" no pudo ejecutarse. Verifica la clave OPENAI_API_KEY en Railway.`;
        }
      } else {
        status = "failed";
        result = "";
      }
    }

    if (status === "failed" && !result.trim()) {
      await persistAgentRunUpdate(db, runId, ctx.tenant.id, "Agent execution unavailable", "failed");

      return NextResponse.json(
        {
          error: "Agente no disponible — configura OPENAI_API_KEY o el backend de agentes (FastAPI).",
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
