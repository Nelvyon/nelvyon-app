/**
 * Punto de entrada ÚNICO y gobernado para las capacidades de texto del SaaS.
 *
 * POR QUÉ EXISTE
 * --------------
 * Las rutas `/api/saas/chat`, `/api/saas/ai-copy`, `/api/saas/agentes/execute` y
 * `/api/saas/social/suggest` hacían `fetch` directo a `api.openai.com`. Eso
 * significaba tres cosas malas a la vez:
 *
 *   1. coste variable por tokens de un proveedor externo para funcionalidad
 *      básica del producto;
 *   2. el producto quedaba INUTILIZABLE sin `OPENAI_API_KEY` — las rutas
 *      devolvían "Configura OPENAI_API_KEY" en vez de responder;
 *   3. esas llamadas esquivaban por completo el gobierno de NELVYON: sin
 *      clasificación de tarea, sin política de routing, sin límite de ejecución,
 *      sin evaluación de riesgo, sin validación de respuesta y —lo más grave—
 *      sin el `tenantId` obligatorio que el router sí exige.
 *
 * Este servicio encamina todo eso a `LocalModelRouter.executeTask`, que ya
 * implementa clasificación, registro de modelos, política, cola, limitador,
 * presupuesto de recursos, evaluación de riesgo y validación.
 *
 * REGLAS INNEGOCIABLES
 * --------------------
 *   - NUNCA hay fallback automático a OpenAI, Anthropic ni ningún proveedor
 *     externo. Si la IA local no está disponible, se devuelve un fallo
 *     explícito y el llamante lo comunica como tal.
 *   - `tenantId` es obligatorio y se toma del contexto SaaS autenticado, así que
 *     el aislamiento por tenant se refuerza respecto al `fetch` directo previo.
 *   - `PRIVATE_MODE` sigue intacto: el router y `privateMode.ts` continúan
 *     bloqueando destinos externos.
 */
import { executeTask } from "../local-ai/router/LocalModelRouter";
import type { RouterTaskInput } from "../local-ai/router/types";

export type NelvyonTextRequest = {
  /** Tenant autenticado. Obligatorio: no se acepta cadena vacía. */
  tenantId: string;
  /** Instrucción de sistema (rol, contexto de empresa, formato esperado). */
  system?: string;
  /** Petición del usuario ya compuesta. */
  prompt: string;
  agentId?: string;
  hints?: RouterTaskInput["hints"];
};

export type NelvyonTextResult =
  | { ok: true; content: string; model: string; taskId: string }
  | {
      ok: false;
      code: "local_ai_unavailable" | "blocked" | "empty_response" | "invalid_request";
      message: string;
      /** Presente cuando el router bloqueó por política/riesgo. */
      blockReason?: string;
    };

/** Mensaje al usuario cuando la IA propia no está operativa. Sin mencionar proveedores externos. */
const UNAVAILABLE_MESSAGE =
  "La IA de NELVYON no está disponible en este momento. Servicio de inferencia local no operativo.";

export async function runNelvyonTextTask(req: NelvyonTextRequest): Promise<NelvyonTextResult> {
  const tenantId = req.tenantId?.trim();
  if (!tenantId) {
    return { ok: false, code: "invalid_request", message: "tenantId es obligatorio." };
  }
  const prompt = req.prompt?.trim();
  if (!prompt) {
    return { ok: false, code: "invalid_request", message: "prompt vacío." };
  }

  const query = req.system?.trim() ? `${req.system.trim()}\n\n${prompt}` : prompt;

  let result;
  try {
    result = await executeTask({
      tenantId,
      query,
      agentId: req.agentId,
      hints: req.hints,
    });
  } catch (err) {
    /**
     * Fallo de la infraestructura local (Ollama caído, Postgres de local-ai sin
     * esquema RAG, circuito abierto...). Se degrada de forma explícita.
     * NO se intenta ningún proveedor externo: ese era justo el problema.
     */
    console.error("[NelvyonAiTextService] inferencia local no disponible", err);
    return { ok: false, code: "local_ai_unavailable", message: UNAVAILABLE_MESSAGE };
  }

  if (result.blocked) {
    return {
      ok: false,
      code: "blocked",
      message: result.content || "Solicitud bloqueada por la política de NELVYON.",
      blockReason: result.blockReason,
    };
  }

  const content = result.content?.trim() ?? "";
  if (!content) {
    return { ok: false, code: "empty_response", message: "La IA local no devolvió contenido." };
  }

  return {
    ok: true,
    content,
    model: result.meta?.finalModel ?? "local",
    taskId: result.taskId,
  };
}

/** Código HTTP coherente para un fallo de `runNelvyonTextTask`. */
export function nelvyonTextErrorStatus(code: Extract<NelvyonTextResult, { ok: false }>["code"]): number {
  switch (code) {
    case "invalid_request":
      return 400;
    case "blocked":
      return 403;
    default:
      return 503;
  }
}
