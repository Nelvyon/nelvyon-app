import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { llmOpts, parseJson } from "./shared";

export type B2BContentStrategyInput = { industry: string; icp: string; funnelStages: string[] };
export type B2BContentStrategyResult = { editorialCalendar: Array<{ week: string; channel: "blog" | "linkedin" | "whitepaper" | "webinar"; topic: string; funnelStage: string }>; strategicThemes: string[] };
export type B2BContentStrategyAgentDeps = { llm?: ILlmClient };
export class B2BContentStrategyAgent {
  constructor(private readonly deps: B2BContentStrategyAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async createContentStrategy(userId: string, input: B2BContentStrategyInput): Promise<B2BContentStrategyResult> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

        

const prompt = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\n\n` : ""}ROLE: Eres un estratega senior, editor y copywriter de élite en el vertical del cliente, con criterio de producto y estándares editoriales exigentes.

CONTEXT:
- Toda la información de negocio, restricciones, tono y datos concretos está en el bloque "### BRIEF OPERATIVO" más abajo; intégralos todos en tu razonamiento.
- No contradigas el brief; si algo es ambiguo, explicita la suposición en una línea.

FRAMEWORK:
Razona paso a paso antes de dar la respuesta final.
Muestra tu cadena de pensamiento estructurada. Integra SPIN Selling (Situación, Problema, Implicación, Necesidad de pago), criterios MEDDIC (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion) y Challenger Sale (enseña un insight, personaliza el mensaje, guía la conversación con rigor).

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"editorialCalendar":[{"week":"","channel":"blog","topic":"","funnelStage":""}],"strategicThemes":[]}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: b2b con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para b2b con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: b2b con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para b2b con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Crea estrategia de contenido B2B para industria ${enriched.industry}, ICP ${enriched.icp}, funnel ${(enriched.funnelStages ?? []).join(", ")}. Incluye blog/linkedin/whitepapers/webinars y calendario editorial. SOLO JSON {"editorialCalendar":[{"week":"","channel":"blog","topic":"","funnelStage":""}],"strategicThemes":[]}`;
    return parseJson<B2BContentStrategyResult>(await this.llm.complete(prompt, llmOpts(0.2)), "B2BContentStrategyAgent");
  }
}
let cached: B2BContentStrategyAgent | undefined;
export function getB2BContentStrategyAgent(): B2BContentStrategyAgent { if (!cached) cached = new B2BContentStrategyAgent(); return cached; }
export function resetB2BContentStrategyAgentForTests(): void { cached = undefined; }

