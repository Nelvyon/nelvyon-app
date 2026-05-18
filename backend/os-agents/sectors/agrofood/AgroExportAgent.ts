import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { AgroInput, AgroOutput } from "./shared";
import { agroLlmOpts } from "./shared";

export type AgroExportAgentDeps = { llm?: ILlmClient };
export class AgroExportAgent {
  constructor(private readonly deps: AgroExportAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: AgroInput): Promise<AgroOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const ori = enriched.origin ? ` Procedencia producto: ${enriched.origin}.` : "";
        

const prompt = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\n\n` : ""}ROLE: Eres un estratega senior, editor y copywriter de élite en el vertical del cliente, con criterio de producto y estándares editoriales exigentes.

CONTEXT:
- Toda la información de negocio, restricciones, tono y datos concretos está en el bloque "### BRIEF OPERATIVO" más abajo; intégralos todos en tu razonamiento.
- No contradigas el brief; si algo es ambiguo, explicita la suposición en una línea.

FRAMEWORK: Jobs To Be Done (jobs funcionales, emocionales y sociales), desglose MECE de la propuesta, y OKR de ejemplo (1 objetivo + 2–3 resultados clave medibles o auditables cualitativamente).

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
Internacionalización agro "${enriched.businessName}" (${enriched.productType}, ${enriched.targetMarket}, tono ${enriched.tone}).${ori}
- Mercados ejemplo AOVE EEUU vino eco Alemania jamón CN hipótesis verificar estudios externos.
- Propuesta valor adaptada país regulación sanitarias mención alto nivel no asesoría legal formal.
- Deck inglés estructura problem solución muestras logística HS codes placeholder abogado aduanas.
- Ferias SIAL Anuga Fancy Food plan pre post reunión KPI follow-up.
- Email importadores distribuidores internacionales muestra incoterms disclaimers Incoterms reales.
- Certificaciones destino BRC FDA organics placeholder checklist consultora export.`;
    const __crmOut = { agentId: "agro-export", result: await this.llm.complete(prompt, agroLlmOpts(0.4)), generatedAt: new Date().toISOString() };
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
let agroExportCached: AgroExportAgent | undefined;
export function getAgroExportAgent(): AgroExportAgent {
  if (!agroExportCached) agroExportCached = new AgroExportAgent();
  return agroExportCached;
}
export function resetAgroExportAgentForTests(): void { agroExportCached = undefined; }
