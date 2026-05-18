import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { HomeInput, HomeOutput } from "./shared";
import { homeLlmOpts } from "./shared";

export type HomeBudgetEmailAgentDeps = { llm?: ILlmClient };
export class HomeBudgetEmailAgent {
  constructor(private readonly deps: HomeBudgetEmailAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: HomeInput): Promise<HomeOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

        

const prompt = `### ESTÁNDAR NELVYON OS — PROMPTS ÉLITE v1
1. ROL EXPERTO verificable · 2. CONTEXTO del cliente · 3. TAREA con formato estructurado · 4. Ejemplos concretos · 5. Sin relleno genérico · 6. Calidad top 1% mundial.

${enriched._clientProfileBrief ? `${String(enriched._clientProfileBrief).trim()}\n\n` : ""}ROLE: Eres un estratega senior, editor y copywriter de élite en el vertical del cliente, con criterio de producto y estándares editoriales exigentes.

CONTEXT:
Usa los datos reales del contacto para personalizar cada párrafo.
Ninguna frase debe poder aplicarse a otro contacto distinto.
- Toda la información de negocio, restricciones, tono y datos concretos está en el bloque "### BRIEF OPERATIVO" más abajo; intégralos todos en tu razonamiento.
- No contradigas el brief; si algo es ambiguo, explicita la suposición en una línea.

FRAMEWORK: Usa StoryBrand SB7 (héroe, problema, guía, plan, llamada a la acción, éxito, fracaso a evitar) y Value Ladder (entrada de valor → oferta central → ascenso) para estructurar mensajes y CTAs coherentes.

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: home con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para home con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: home con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para home con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Conversión presupuestos para "${enriched.businessName}" (${enriched.serviceType}, ${enriched.targetArea}, ${enriched.tone}):
- Email envío presupuesto: valor (garantía, plazos, materiales) no solo precio.
- Secuencia 24h / 48h / 72h si no responde (asunto + cuerpo breve).
- Objeciones: precio alto, comparando competencia, "lo pienso" con respuestas modelo.
- Financiación reformas grandes (mención genérica partners).
- Garantía satisfacción como cierre (redacción prudente).
- Esquema contrato obra sencillo (cláusulas checklist, no sustituye abogado).
Placeholders [IMPORTE], [PLAZO].`;
    const __crmOut = { agentId: "home-budget-email", result: await this.llm.complete(prompt, homeLlmOpts(0.5)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "home",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let homeBudgetEmailCached: HomeBudgetEmailAgent | undefined;
export function getHomeBudgetEmailAgent(): HomeBudgetEmailAgent { if (!homeBudgetEmailCached) homeBudgetEmailCached = new HomeBudgetEmailAgent(); return homeBudgetEmailCached; }
export function resetHomeBudgetEmailAgentForTests(): void { homeBudgetEmailCached = undefined; }
