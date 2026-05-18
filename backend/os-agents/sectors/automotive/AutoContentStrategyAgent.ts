import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { AutoInput, AutoOutput } from "./shared";
import { autoLlmOpts } from "./shared";

export type AutoContentStrategyAgentDeps = { llm?: ILlmClient };
export class AutoContentStrategyAgent {
  constructor(private readonly deps: AutoContentStrategyAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: AutoInput): Promise<AutoOutput> {
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
Muestra tu cadena de pensamiento estructurada. AIDA + PAS y narrativa antes / después / puente (dolor actual → amplificación creíble → puente con tu propuesta → estado futuro).

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: automotive con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para automotive con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: automotive con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para automotive con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Estrategia contenido RRSS/longform "${enriched.businessName}" (${enriched.businessType}, audiencia ${enriched.targetClient}, ${enriched.tone}):
- 20 ideas IG/TikTok/YouTube comparativas mantenimiento before/after test drive virtual etc.
- Guión vídeo ~90s presentar vehículo en stock (estructura hook-specs-beneficios-CTA).
- Artículo blog ~1000 palabras guía compra o mantenimiento o EV panorama 2026 (datos modelo genéricos).
- Plan YouTube taller/concesionario: frecuencia formatos thumbnails ideales.
Compliance: no conducir usando móvil, menciones marca prudencia publicitaria.
Location context: ${enriched.location ?? "España"}.`;
    const __crmOut = { agentId: "auto-content-strategy", result: await this.llm.complete(prompt, autoLlmOpts(0.2)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "automotive",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let autoContentStrategyCached: AutoContentStrategyAgent | undefined;
export function getAutoContentStrategyAgent(): AutoContentStrategyAgent { if (!autoContentStrategyCached) autoContentStrategyCached = new AutoContentStrategyAgent(); return autoContentStrategyCached; }
export function resetAutoContentStrategyAgentForTests(): void { autoContentStrategyCached = undefined; }
