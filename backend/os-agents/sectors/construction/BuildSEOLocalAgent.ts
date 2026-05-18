import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { BuildInput, BuildOutput } from "./shared";
import { buildLlmOpts } from "./shared";

export type BuildSEOLocalAgentDeps = { llm?: ILlmClient };
export class BuildSEOLocalAgent {
  constructor(private readonly deps: BuildSEOLocalAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: BuildInput): Promise<BuildOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const loc = enriched.location ?? "ciudad España";
        

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
Input: construction con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para construction con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: construction con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para construction con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
SEO local construcción "${enriched.businessName}" (${enriched.serviceType}, ${enriched.targetClient}, ${enriched.tone}, ${loc}):
- Keywords especialidad ciudad interiorismo obra nueva reforma cocinas ejemplos.
- GMB categorías texto fotos proyecto créditos autor si aplica.
- Meta páginas servicio cinco combinaciones ejemplo.
- JSON-LD HomeAndConstructionBusiness GeneralContractor placeholders.
- Estrategia reseñas timing post acta recepción o hito importante.
Link building colegios asociaciones prensa local sin enlaces pagados opacos.`;
    const __crmOut = { agentId: "build-seo-local", result: await this.llm.complete(prompt, buildLlmOpts(0.2)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "construction",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let buildSEOLocalCached: BuildSEOLocalAgent | undefined;
export function getBuildSEOLocalAgent(): BuildSEOLocalAgent { if (!buildSEOLocalCached) buildSEOLocalCached = new BuildSEOLocalAgent(); return buildSEOLocalCached; }
export function resetBuildSEOLocalAgentForTests(): void { buildSEOLocalCached = undefined; }
