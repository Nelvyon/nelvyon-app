/**
 * Proveedor local (Ollama). Es el preferente porque no cuesta dinero.
 *
 * La lógica de configuración y de timeout es la que ya tenía `llmAdapter`, sin
 * cambios de comportamiento: se ha movido aquí para que el adaptador no tenga
 * que conocer a ningún proveedor por su nombre.
 */

import { getOllamaClient } from "../../../local-ai/OllamaClient";
import { claimLlmCallTimeoutMs } from "../llmBudget";
import type {
  ProveedorLlm,
  ResultadoDeGeneracion,
  SolicitudDeGeneracion,
} from "./index";
import { costePorTabla } from "./index";

/**
 * Timeout por defecto de una llamada a Ollama. Réplica de la regla de
 * `OllamaClient.chat` para poder recortarla contra el presupuesto ANTES de
 * entrar en el cliente: los modelos `8b` son notablemente más lentos.
 */
export function timeoutPorDefectoDeOllama(model: string | undefined): number {
  const pesado = (model ?? "").includes("8b");
  return Number(
    pesado
      ? (process.env.OLLAMA_STRATEGY_TIMEOUT_MS ?? 300_000)
      : (process.env.OLLAMA_FAST_TIMEOUT_MS ?? 120_000),
  );
}

/** True cuando el pipeline autónomo puede usar Ollama local. */
export function ollamaEstaConfigurado(): boolean {
  if (process.env.OLLAMA_CONFIGURED?.trim() === "1") return true;
  return Boolean(
    process.env.OLLAMA_HOST?.trim() ||
      process.env.OLLAMA_BASE_URL?.trim() ||
      process.env.NELVYON_LOCAL_AI_URL?.trim() ||
      process.env.LOCAL_AI_BASE_URL?.trim(),
  );
}

export const proveedorOllama: ProveedorLlm = {
  id: "ollama",

  estaConfigurado: ollamaEstaConfigurado,

  estaPermitido() {
    // Local: no sale del perímetro, así que no hay política que lo bloquee.
    return { permitido: true };
  },

  async generar(req: SolicitudDeGeneracion): Promise<ResultadoDeGeneracion> {
    const timeoutMs = claimLlmCallTimeoutMs(
      req.timeoutMs ?? timeoutPorDefectoDeOllama(req.modelo),
      req.etiqueta,
    );
    const r = await getOllamaClient().chat(
      [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      { format: "json", numPredict: 3072, model: req.modelo, timeoutMs },
    );
    const content = r.content?.trim() ?? "";
    if (!content) throw new Error("Ollama empty content");
    return {
      content,
      // Ollama separa el conteo del prompt del de la generación. La auditoría
      // guardaba sólo la suma; ahora se conservan los dos.
      tokensEntrada: r.promptEvalCount ?? 0,
      tokensSalida: r.evalCount ?? 0,
      model: r.model || req.modelo || "ollama",
    };
  },

  estimarCoste: costePorTabla("ollama"),
};
