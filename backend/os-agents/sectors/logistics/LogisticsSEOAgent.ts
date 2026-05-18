import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { LogisticsInput, LogisticsOutput } from "./shared";
import { logisticsLlmOpts } from "./shared";

export type LogisticsSEOAgentDeps = { llm?: ILlmClient };
export class LogisticsSEOAgent {
  constructor(private readonly deps: LogisticsSEOAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: LogisticsInput): Promise<LogisticsOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const cov = enriched.coverage ? ` Enfoque geo/cobertura: ${enriched.coverage}.` : "";
        

const prompt = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\n\n` : ""}ROLE: Eres un estratega senior, editor y copywriter de élite en el vertical del cliente, con criterio de producto y estándares editoriales exigentes.

CONTEXT:
- Toda la información de negocio, restricciones, tono y datos concretos está en el bloque "### BRIEF OPERATIVO" más abajo; intégralos todos en tu razonamiento.
- No contradigas el brief; si algo es ambiguo, explicita la suposición en una línea.

FRAMEWORK:
Razona paso a paso antes de dar la respuesta final.
Muestra tu cadena de pensamiento estructurada. Aplica E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) y Skyscraper Technique: clarifica intención de búsqueda, supera resultados medios con secciones más útiles, datos verificables, y fuentes o comprobaciones cuando falte evidencia real.

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: logistics con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para logistics con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: logistics con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para logistics con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
SEO empresas logísticas "${enriched.businessName}" (${enriched.serviceType}, ${enriched.targetClient}, ${enriched.tone}).${cov}
- Keywords servicio+cobertura ejemplo transporte mercancías Madrid ecommerce España mudanzas.
- Meta titles/descriptions páginas servicio plantillas.
- Schema MovingCompany DeliveryService según modelo negocio nota validación técnica.
- Estrategia reseñas Google proceso solicitud B2C/B2B.
- Directorios CETM Wtransnet transporte ejemplo integración fichas.
- Link building medios Transporte Profesional Logística Profesional propuesta colaboraciones.`;
    const __crmOut = { agentId: "logistics-seo", result: await this.llm.complete(prompt, logisticsLlmOpts(0.2)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "logistics",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let logisticsSEOAgentCached: LogisticsSEOAgent | undefined;
export function getLogisticsSEOAgent(): LogisticsSEOAgent {
  if (!logisticsSEOAgentCached) logisticsSEOAgentCached = new LogisticsSEOAgent();
  return logisticsSEOAgentCached;
}
export function resetLogisticsSEOAgentForTests(): void { logisticsSEOAgentCached = undefined; }
