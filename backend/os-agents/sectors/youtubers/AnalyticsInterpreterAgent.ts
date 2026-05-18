import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";

import { llmOpts, parseJson } from "./shared";

export type AnalyticsInterpreterInput = { ctr: number; retention: number; rpm: number; subscribersDelta: number; context?: string };
export type AnalyticsInterpreterResult = { diagnosis: string; prioritizedActions: Array<{ priority: "high" | "medium" | "low"; action: string; expectedImpact: string }> };
export type AnalyticsInterpreterAgentDeps = { llm?: ILlmClient };

export class AnalyticsInterpreterAgent {
  constructor(private readonly deps: AnalyticsInterpreterAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async interpretAnalytics(userId: string, input: AnalyticsInterpreterInput): Promise<AnalyticsInterpreterResult> {
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
Muestra tu cadena de pensamiento estructurada. ROAS y eficiencia de inversión: define supuestos, estructura de campaña, creatividades/keywords y cadena de atribución; alinea con North Star Metric (una métrica directora + métricas input explícitas).

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Sigue exactamente el esquema indicado al final del brief operativo.

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: youtubers con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para youtubers con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: youtubers con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para youtubers con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Interpreta métricas YouTube y recomienda acciones accionables priorizadas.
CTR ${enriched.ctr}%, retención ${enriched.retention}%, RPM ${enriched.rpm}, delta subs ${enriched.subscribersDelta}, contexto ${enriched.context ?? "general"}.
Devuelve SOLO JSON: {"diagnosis":"","prioritizedActions":[{"priority":"high","action":"","expectedImpact":""}]}`;
    return parseJson<AnalyticsInterpreterResult>(await this.llm.complete(prompt, llmOpts(0.2)), "AnalyticsInterpreterAgent");
  }
}
let cached: AnalyticsInterpreterAgent | undefined;
export function getAnalyticsInterpreterAgent(): AnalyticsInterpreterAgent { if (!cached) cached = new AnalyticsInterpreterAgent(); return cached; }
export function resetAnalyticsInterpreterAgentForTests(): void { cached = undefined; }
