import type { ILlmClient } from "../LlmClient";
import { LlmClient } from "../LlmClient";
import { AbTestingService } from "./AbTestingService";
import type { AbExperiment } from "./types";

function parseVariants(raw: string, nVariants: number): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      const v = (parsed as { variants?: unknown }).variants;
      if (Array.isArray(v)) {
        const out = v
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter((x) => x.length > 0);
        if (out.length >= nVariants) return out.slice(0, nVariants);
      }
    }
  } catch {
    // fallback below
  }
  return raw
    .split(/\r?\n/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, nVariants);
}

function variantName(i: number): string {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

export type AbAgentServiceDeps = { llm?: ILlmClient };

export class AbAgentService {
  constructor(private readonly deps: AbAgentServiceDeps = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async generateVariants(
    userId: string,
    channel: "email" | "social" | "ads" | "landing",
    baseContent: string,
    nVariants = 2,
    experimentName?: string,
  ): Promise<AbExperiment> {
    const n = Math.max(2, Math.min(5, Math.round(nVariants)));
    const prompt = [
      "Genera variantes A/B multicanal en español.",
      `Canal: ${channel}.`,
      `Contenido base: ${baseContent}`,
      `Devuelve exactamente ${n} variantes distintas y accionables.`,
      'Formato estricto JSON: {"variants":["...", "..."]}',
      "No incluyas markdown ni texto adicional.",
    ].join("\n");

    const raw = await this.llm.complete(prompt, {
      model: "gpt-4o",
      maxTokens: 2000,
      temperature: 0.7,
    });
    const contents = parseVariants(raw, n);
    if (contents.length < 2) throw new Error("No se pudieron generar variantes suficientes");
    const variants = contents.map((content, i) => ({ name: variantName(i), content }));
    const name = experimentName?.trim() || `AB ${channel} ${new Date().toISOString().slice(0, 10)}`;
    return AbTestingService.createExperiment(userId, name, channel, variants);
  }
}
