import { NextResponse } from "next/server";

import { requireSaasContext, saasErrorBody, saasErrorStatus } from "@nelvyon/saas";
import { getDb } from "@nelvyon/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function ensureSchema() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS saas_agent_runs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   TEXT NOT NULL,
      agent_id    TEXT NOT NULL,
      input       TEXT NOT NULL,
      output      TEXT,
      status      TEXT NOT NULL DEFAULT 'running',
      error       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function POST(req: Request) {
  try {
    const ctx = await requireSaasContext(req, "workflows.execute");
    const body = (await req.json()) as { agentId?: string; input?: string };

    if (!body.agentId?.trim() || !body.input?.trim()) {
      return NextResponse.json({ error: "agentId and input are required" }, { status: 400 });
    }

    await ensureSchema();
    const db = getDb();

    // Log the run
    const runRows = await db.execute(sql`
      INSERT INTO saas_agent_runs (tenant_id, agent_id, input, status)
      VALUES (${ctx.tenant.id}, ${body.agentId.trim()}, ${body.input.trim()}, 'running')
      RETURNING id
    `);
    const runId = (runRows.rows[0] as { id: string }).id;

    // Try to call Python backend agent
    let result = "";
    let status = "completed";

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
    } catch (backendErr) {
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
        status = "failed";
        result = `El agente "${body.agentId}" está disponible pero requiere OPENAI_API_KEY en Railway para ejecutarse.`;
      }
    }

    // Update run record
    await db.execute(sql`
      UPDATE saas_agent_runs
      SET output = ${result}, status = ${status}, updated_at = NOW()
      WHERE id = ${runId}
    `).catch(() => {});

    return NextResponse.json({ result, runId, status });
  } catch (e: unknown) {
    return NextResponse.json(saasErrorBody(e), { status: saasErrorStatus(e) });
  }
}
