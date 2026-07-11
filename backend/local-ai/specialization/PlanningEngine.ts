import { getLocalAiConfig } from "../config";
import { privateModeFetch } from "../../private-ai/privateMode";
import { CONSTITUTION_RULES } from "./constitution";
import type { KnowledgeDomainId } from "./ontology";

export type PlanSection = {
  key: string;
  content: string;
};

export type StructuredPlan = {
  objetivo: string;
  contexto: string;
  diagnostico: string;
  hipotesis: string[];
  prioridades: string[];
  fases: { name: string; tasks: string[]; duration?: string }[];
  dependencias: string[];
  riesgos: { risk: string; mitigation: string }[];
  recursos: string[];
  calendario: string;
  metricas: string[];
  criterios_aceptacion: string[];
  escenarios: string[];
  contingencia: string;
  fuentes: string[];
  confianza: number;
};

export type PlanRequest = {
  tenantId: string;
  planType: "marketing" | "seo" | "ads" | "email" | "crm" | "saas" | "growth" | "operations";
  domain: KnowledgeDomainId;
  context: string;
  ragContext?: string;
};

export class PlanningEngine {
  async generatePlan(request: PlanRequest): Promise<{ raw: string; parsed?: Partial<StructuredPlan> }> {
    const cfg = getLocalAiConfig();
    const prompt = `${CONSTITUTION_RULES.systemPromptPrefix}

TAREA: Crear un plan profesional de tipo "${request.planType}" para NELVYON.

CONTEXTO DEL CLIENTE/PROYECTO:
${request.context}

${request.ragContext ? `FUENTES INDEXADAS:\n${request.ragContext}` : ""}

FORMATO OBLIGATORIO — incluye TODAS estas secciones con contenido sustancial:
objetivo · contexto · diagnóstico · hipótesis · prioridades · fases · dependencias ·
riesgos · recursos · calendario · métricas · criterios de aceptación · escenarios ·
contingencia · fuentes · confianza (número 0-1)

No inventes métricas ni garantías. Responde en español.`;

    const res = await privateModeFetch(`${cfg.ollamaBaseUrl}/api/generate`, "external_fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(300_000),
    });

    const body = (await res.json()) as { response?: string };
    const raw = body.response ?? "";
    return { raw, parsed: this.tryParsePlan(raw) };
  }

  private tryParsePlan(raw: string): Partial<StructuredPlan> | undefined {
    const confMatch = raw.match(/confianza[:\s]+(0?\.\d+|1(?:\.0)?)/i);
    return {
      confianza: confMatch ? Number(confMatch[1]) : undefined,
      fuentes: (raw.match(/\[(\d+)\]/g) ?? []).map(String),
    };
  }
}

let _engine: PlanningEngine | undefined;
export function getPlanningEngine(): PlanningEngine {
  _engine ??= new PlanningEngine();
  return _engine;
}
