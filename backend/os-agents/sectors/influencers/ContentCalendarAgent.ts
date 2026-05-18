import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { llmOpts, parseJson } from "./shared";

export type ContentCalendarInput = { niche: string; goals: string; platforms: string[] };
export type ContentCalendarResult = { calendar: Array<{ platform: string; day: string; time: string; theme: string; format: string }> };
export type ContentCalendarAgentDeps = { llm?: ILlmClient };
export class ContentCalendarAgent {
  constructor(private readonly deps: ContentCalendarAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async generateCalendar(userId: string, input: ContentCalendarInput): Promise<ContentCalendarResult> {
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

FRAMEWORK: AIDA + PAS y narrativa antes / después / puente (dolor actual → amplificación creíble → puente con tu propuesta → estado futuro).

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"calendar":[{"platform":"","day":"","time":"","theme":"","format":""}]}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: influencers con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para influencers con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: influencers con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para influencers con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Crea calendario mensual elite para influencers (IG/TikTok/Twitter/LinkedIn). Nicho ${enriched.niche}. Goals ${enriched.goals}. Plataformas ${(enriched.platforms ?? []).join(", ")}. Usa benchmarks top (Chiara/Charli/GaryVee). SOLO JSON {"calendar":[{"platform":"","day":"","time":"","theme":"","format":""}]}`;
    return parseJson<ContentCalendarResult>(await this.llm.complete(prompt, llmOpts(0.7)), "ContentCalendarAgent");
  }
}
let cached: ContentCalendarAgent | undefined;
export function getContentCalendarAgent(): ContentCalendarAgent { if (!cached) cached = new ContentCalendarAgent(); return cached; }
export function resetContentCalendarAgentForTests(): void { cached = undefined; }

