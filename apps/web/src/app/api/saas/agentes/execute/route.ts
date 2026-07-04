import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus, buildMockAgentOutput } from "@nelvyon/saas";
import { DbClient } from "../../../../../../../../backend/db/DbClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as { agentId?: string; input?: string };

    if (!body.agentId?.trim() || !body.input?.trim()) {
      return NextResponse.json({ error: "agentId and input are required" }, { status: 400 });
    }

    const db = DbClient.getInstance();
    const runRows = await db.query<{ id: string }>(
      `INSERT INTO saas_agent_runs (tenant_id, agent_id, input, status)
       VALUES ($1, $2, $3, 'running')
       RETURNING id`,
      [ctx.tenant.id, body.agentId.trim(), body.input.trim()],
    );
    const runId = runRows[0].id;

    // Try to call Python backend agent
    let result = "";
    let status = "completed";
    let usedMock = false;

    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/v1/os/agents/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: body.agentId,
          input: body.input,
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
                content: `Eres el agente especializado de Nelvyon para el sector "${body.agentId}". Eres un experto en marketing digital, SEO, publicidad y crecimiento. Responde de forma estructurada, accionable y en español. Da resultados concretos que el usuario pueda implementar hoy mismo.`,
              },
              { role: "user", content: body.input },
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
          result = `El agente "${body.agentId}" no pudo ejecutarse. Verifica la clave OPENAI_API_KEY en Railway.`;
        }
      } else {
        status = "mock";
        usedMock = true;
        result = buildMockAgentOutput(body.agentId.trim(), body.input.trim(), ctx.tenant.companyName);
      }
    }

    // Update run record
    await db.query(
      `UPDATE saas_agent_runs SET output = $1, status = $2, updated_at = NOW() WHERE id = $3 AND tenant_id = $4`,
      [result, status, runId, ctx.tenant.id],
    ).catch(() => {});

    if (usedMock) {
      return NextResponse.json(
        {
          error: "Agente en modo plantilla — configura OPENAI_API_KEY o el backend de agentes.",
          code: "AGENT_MOCK",
          result,
          runId,
          status: "mock",
          mock: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      result,
      runId,
      status,
      mock: false,
    });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
