/**
 * Live orchestrator job executor — Ollama chat (no paid APIs).
 * Enabled when NELVYON_ORCHESTRATOR_LIVE=1 and Ollama reachable.
 */

import { OllamaClient } from "../local-ai/OllamaClient";
import { evaluateSecurityGuard } from "../local-ai/specialization/SecurityGuard";
import type { OrchestratorExecuteInput, OrchestratorExecuteResult } from "./jobExecutor";

const SYSTEM = `Eres un agente especializado de NELVYON. Responde en español.
Debes incluir EXACTAMENTE estos encabezados markdown en inglés (no los traduzcas):
## Analysis
## Recommendations
## Next steps
No inventes que ejecutaste herramientas. Si faltan datos, dilo.
Para acciones sensibles (billing, producción, borrados) indica que requiere aprobación humana.
Sé concreto y breve (máx 400 palabras).`;

export async function liveOllamaJobExecutor(
  input: OrchestratorExecuteInput,
): Promise<OrchestratorExecuteResult> {
  const trimmed = input.input.trim();
  if (!trimmed) {
    return {
      ok: false,
      validated: false,
      mode: "live",
      output: "",
      acceptance: ["non_empty_input"],
      evidence: { reason: "empty_input" },
      error: "empty_input",
    };
  }

  const guard = evaluateSecurityGuard(trimmed);
  if (guard.blocked) {
    return {
      ok: false,
      validated: true,
      mode: "live",
      output: "blocked_by_policy",
      acceptance: ["security_block"],
      evidence: { blocked: true, category: guard.category, llmInvoked: false, toolExecuted: false },
      error: "blocked_by_policy",
    };
  }

  const client = new OllamaClient();
  const model =
    process.env.OLLAMA_MODEL?.trim() ||
    process.env.NELVYON_OLLAMA_MODEL?.trim() ||
    "llama3.1:8b-instruct-q4_K_M";

  const t0 = performance.now();
  try {
    const chat = await client.chat(
      [
        { role: "system", content: `${SYSTEM}\nAgente: ${input.agentId}` },
        {
          role: "user",
          content: `Tarea para agente «${input.agentId}» (patrón ${input.pattern}):\n${trimmed.slice(0, 4000)}`,
        },
      ],
      {
        model,
        temperature: 0.2,
        numPredict: 700,
        numCtx: 4096,
        timeoutMs: Number(process.env.NELVYON_LIVE_AGENT_TIMEOUT_MS ?? 180_000),
      },
    );

    const output = chat.content.trim();
    const hasAnalysis = /##\s*(Analysis|An[aá]lisis)/i.test(output);
    const hasNext = /##\s*(Next steps|Pr[oó]ximos pasos|Siguientes pasos)/i.test(output);
    const softStructure =
      (/recomend/i.test(output) || /##\s*Recommendations/i.test(output)) &&
      (/paso/i.test(output) || /next/i.test(output) || /seguimiento/i.test(output));
    const hasSections = (hasAnalysis && hasNext) || softStructure;
    const noFakeTool = !/tool executed|ejecuté la herramienta|llamé a la API/i.test(output);
    const validated = hasSections && noFakeTool && output.length >= 40;
    const latencyMs = Math.round(performance.now() - t0);

    return {
      ok: validated,
      validated,
      mode: "live",
      output,
      acceptance: ["has_structured_sections", "no_fake_tool"],
      evidence: {
        agentId: input.agentId,
        model: chat.model,
        latencyMs,
        llmInvoked: true,
        toolExecuted: false,
        truncated: chat.truncated,
        correlationId: input.correlationId,
        tenantId: input.tenantId,
      },
      error: validated ? undefined : "live_validation_failed",
    };
  } catch (e) {
    return {
      ok: false,
      validated: false,
      mode: "live",
      output: "",
      acceptance: ["ollama_available"],
      evidence: { llmInvoked: false },
      error: e instanceof Error ? e.message : "ollama_failed",
    };
  }
}

export async function probeOllamaForElite(): Promise<{
  available: boolean;
  model: string | null;
  error?: string;
  ms?: number;
}> {
  const model =
    process.env.OLLAMA_MODEL?.trim() ||
    process.env.NELVYON_OLLAMA_MODEL?.trim() ||
    "llama3.1:8b-instruct-q4_K_M";
  try {
    const client = new OllamaClient();
    const okModel = await client.isModelAvailable(model);
    if (!okModel) {
      // fallback: any model
      const tagsOk = await client.isModelAvailable();
      if (!tagsOk) return { available: false, model: null, error: "ollama_unreachable" };
      return { available: true, model: "default", error: `preferred_model_missing:${model}` };
    }
    const probe = await client.probeLoad({ model, numCtx: 2048 });
    return {
      available: probe.ok,
      model,
      ms: probe.ms,
      error: probe.error,
    };
  } catch (e) {
    return { available: false, model: null, error: e instanceof Error ? e.message : String(e) };
  }
}
