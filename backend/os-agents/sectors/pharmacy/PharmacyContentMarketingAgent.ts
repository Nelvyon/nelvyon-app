import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { PharmacyInput, PharmacyOutput } from "./shared";
import { pharmacyLlmOpts } from "./shared";

export type PharmacyContentMarketingAgentDeps = { llm?: ILlmClient };
export class PharmacyContentMarketingAgent {
  constructor(private readonly deps: PharmacyContentMarketingAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: PharmacyInput): Promise<PharmacyOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const loc = enriched.location ? ` Zona: ${enriched.location}.` : "";
        

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
Input: pharmacy con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para pharmacy con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: pharmacy con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para pharmacy con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Contenido educativo farmacia "${enriched.businessName}" (${enriched.businessType}, ${enriched.targetClient}, tono ${enriched.tone}).${loc}
- 20 ideas RRSS por especialidad dermocosmética nutrición salud estacional OTC informativo.
- Artículo blog ~1000 palabras ciudadano tema frecuente con remisión a profesional sanitario si síntomas.
- FAQ mostrador 10 preguntas con respuestas generales sin diagnóstico.
- Newsletter mensual estacional formato secciones.
- Política contenido AEMPS publicidad sanitaria: sin propiedades terapéuticas no autorizadas en medicamentos/OTC.`;
    const __crmOut = { agentId: "pharmacy-content-marketing", result: await this.llm.complete(prompt, pharmacyLlmOpts(0.7)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "pharmacy",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let pharmacyContentMarketingCached: PharmacyContentMarketingAgent | undefined;
export function getPharmacyContentMarketingAgent(): PharmacyContentMarketingAgent { if (!pharmacyContentMarketingCached) pharmacyContentMarketingCached = new PharmacyContentMarketingAgent(); return pharmacyContentMarketingCached; }
export function resetPharmacyContentMarketingAgentForTests(): void { pharmacyContentMarketingCached = undefined; }
