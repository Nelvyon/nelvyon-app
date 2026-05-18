import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { AgroInput, AgroOutput } from "./shared";
import { agroLlmOpts } from "./shared";

export type AgroProductDescriptionAgentDeps = { llm?: ILlmClient };
export class AgroProductDescriptionAgent {
  constructor(private readonly deps: AgroProductDescriptionAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: AgroInput): Promise<AgroOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const ori = enriched.origin ? ` Origen/DOP: ${enriched.origin}.` : "";
        

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
Input: agrofood con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para agrofood con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: agrofood con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para agrofood con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Descripción producto agroalimentario "${enriched.businessName}" (tipo ${enriched.productType}, mercado ${enriched.targetMarket}, tono ${enriched.tone}).${ori}
- Nombre evocador variedad terruño placeholders sin marca registrada ajenos.
- Perfil sensorial color aroma sabor textura storytelling apetito sin exageración médica.
- Historia productor territorio DO IGP ecológico solo hechos ciertos.
- Proceso artesanal tradicional trazabilidad breve.
- Maridajes usos cocina formato recetas ejemplo.
- Certificaciones DO Bio Fairtrade comunicación legal.
- Copy web marketplace etiqueta normativa país sugerencia revisión etiquetado.`;
    const __crmOut = { agentId: "agro-product-description", result: await this.llm.complete(prompt, agroLlmOpts(0.7)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "agrofood",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let agroProductDescriptionCached: AgroProductDescriptionAgent | undefined;
export function getAgroProductDescriptionAgent(): AgroProductDescriptionAgent {
  if (!agroProductDescriptionCached) agroProductDescriptionCached = new AgroProductDescriptionAgent();
  return agroProductDescriptionCached;
}
export function resetAgroProductDescriptionAgentForTests(): void { agroProductDescriptionCached = undefined; }
