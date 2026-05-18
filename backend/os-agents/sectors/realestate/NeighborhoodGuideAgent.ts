import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { llmOpts, parseJson } from "./shared";

export type NeighborhoodGuideInput = { neighborhood: string; city: string; propertyType: string };
export type NeighborhoodGuideResult = { servicesAndTransit: string[]; schoolsAndLifestyle: string[]; avgPricePerM2: string; trend: string; salesMaterialVersion: string };
export type NeighborhoodGuideAgentDeps = { llm?: ILlmClient };
export class NeighborhoodGuideAgent {
  constructor(private readonly deps: NeighborhoodGuideAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async createNeighborhoodGuide(userId: string, input: NeighborhoodGuideInput): Promise<NeighborhoodGuideResult> {
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

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"servicesAndTransit":[],"schoolsAndLifestyle":[],"avgPricePerM2":"","trend":"","salesMaterialVersion":""}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: realestate con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para realestate con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: realestate con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para realestate con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Crea guía de barrio ${enriched.neighborhood} (${enriched.city}) para ${enriched.propertyType}: servicios, transporte, colegios, restaurantes, precio m2 y tendencia. SOLO JSON {"servicesAndTransit":[],"schoolsAndLifestyle":[],"avgPricePerM2":"","trend":"","salesMaterialVersion":""}`;
    return parseJson<NeighborhoodGuideResult>(await this.llm.complete(prompt, llmOpts(0.4)), "NeighborhoodGuideAgent");
  }
}
let cached: NeighborhoodGuideAgent | undefined;
export function getNeighborhoodGuideAgent(): NeighborhoodGuideAgent { if (!cached) cached = new NeighborhoodGuideAgent(); return cached; }
export function resetNeighborhoodGuideAgentForTests(): void { cached = undefined; }

