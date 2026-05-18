import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { WellnessInput, WellnessOutput } from "./shared";
import { wellnessLlmOpts } from "./shared";

export type WellnessContentMarketingAgentDeps = { llm?: ILlmClient };
export class WellnessContentMarketingAgent {
  constructor(private readonly deps: WellnessContentMarketingAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: WellnessInput): Promise<WellnessOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const spec = enriched.specialization ? ` Vertical: ${enriched.specialization}.` : "";
        

const prompt = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\n\n` : ""}ROLE: Eres un estratega senior, editor y copywriter de élite en el vertical del cliente, con criterio de producto y estándares editoriales exigentes.

CONTEXT:
- Toda la información de negocio, restricciones, tono y datos concretos está en el bloque "### BRIEF OPERATIVO" más abajo; intégralos todos en tu razonamiento.
- No contradigas el brief; si algo es ambiguo, explicita la suposición en una línea.

FRAMEWORK: AIDA + PAS y narrativa antes / después / puente (dolor actual → amplificación creíble → puente con tu propuesta → estado futuro).

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: wellness con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para wellness con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: wellness con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para wellness con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Contenido educativo wellness "${enriched.businessName}" (${enriched.serviceType}, ${enriched.targetClient}, ${enriched.tone}).${spec}
- 20 ideas blog por especialidad peso meditación nutrición entreno.
- Artículo SEO ~1200 palabras outline H2 con disclaimer salud no sustituye profesional sanitario.
- Guía descargable plan entrenamiento recetas mindful placeholders.
- Template episodio podcast/YouTube bienestar.
- Newsletter semanal formato tip accionable.
- Pinterest pines títulos descripciones tableros.
Enfoque evidencia general no diagnóstico.`;
    const __crmOut = { agentId: "wellness-content-marketing", result: await this.llm.complete(prompt, wellnessLlmOpts(0.7)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "wellness",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let wellnessContentMarketingCached: WellnessContentMarketingAgent | undefined;
export function getWellnessContentMarketingAgent(): WellnessContentMarketingAgent { if (!wellnessContentMarketingCached) wellnessContentMarketingCached = new WellnessContentMarketingAgent(); return wellnessContentMarketingCached; }
export function resetWellnessContentMarketingAgentForTests(): void { wellnessContentMarketingCached = undefined; }
