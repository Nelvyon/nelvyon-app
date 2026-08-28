/**
 * Proveedor remoto (OpenAI). APAGADO por defecto y NUNCA es un salto
 * automático desde un fallo local.
 *
 * Las cuatro puertas que ya existían se conservan exactamente: permiso
 * explícito, interruptor maestro de IA, clave presente y ventana de internet
 * bajo modo privado. Sin las cuatro, `estaPermitido()` dice que no y el
 * registro de proveedores ni siquiera lo ofrece, así que no sale una petición.
 */

import {
  assertPrivateOutboundAllowed,
  isInternetTaskAuthorized,
  isPrivateMode,
} from "../../../private-ai/privateMode";
import { isNelvyonAiEnabled } from "../../../private-ai/config";
import type {
  ProveedorLlm,
  ResultadoDeGeneracion,
  SolicitudDeGeneracion,
} from "./index";
import { costePorTabla } from "./index";

export function openAiEstaPermitido(): { permitido: boolean; motivo?: string } {
  if (process.env.AUTONOMOUS_ALLOW_OPENAI?.trim() !== "1") {
    return { permitido: false, motivo: "AUTONOMOUS_ALLOW_OPENAI!=1" };
  }
  // El interruptor maestro manda por encima de cualquier otra condición.
  if (!isNelvyonAiEnabled()) {
    return { permitido: false, motivo: "interruptor maestro de IA apagado" };
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { permitido: false, motivo: "OPENAI_API_KEY ausente" };
  }
  if (isPrivateMode() && !isInternetTaskAuthorized()) {
    return { permitido: false, motivo: "modo privado sin ventana de internet" };
  }
  return { permitido: true };
}

export const proveedorOpenAi: ProveedorLlm = {
  id: "openai",

  estaConfigurado() {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  },

  estaPermitido: openAiEstaPermitido,

  async generar(req: SolicitudDeGeneracion): Promise<ResultadoDeGeneracion> {
    const permiso = openAiEstaPermitido();
    if (!permiso.permitido) {
      throw new Error(`OpenAI not allowed: ${permiso.motivo}`);
    }
    assertPrivateOutboundAllowed("remote_llm");

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error("OPENAI_API_KEY missing");

    const model = req.modelo || process.env.AUTONOMOUS_OPENAI_MODEL?.trim() || "gpt-4o-mini";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 60_000);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        model?: string;
      };

      const content = data.choices?.[0]?.message?.content ?? "";
      if (!content) throw new Error("OpenAI empty content");

      const entrada = data.usage?.prompt_tokens ?? 0;
      const salida =
        data.usage?.completion_tokens ??
        Math.max(0, (data.usage?.total_tokens ?? 0) - entrada);

      return { content, tokensEntrada: entrada, tokensSalida: salida, model: data.model ?? model };
    } finally {
      clearTimeout(timeout);
    }
  },

  estimarCoste: costePorTabla("openai"),
};
