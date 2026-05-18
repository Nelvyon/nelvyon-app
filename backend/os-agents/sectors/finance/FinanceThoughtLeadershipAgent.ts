import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { FinanceInput, FinanceOutput } from "./shared";
import { financeLlmOpts } from "./shared";

export type FinanceThoughtLeadershipAgentDeps = { llm?: ILlmClient };
export class FinanceThoughtLeadershipAgent {
  constructor(private readonly deps: FinanceThoughtLeadershipAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: FinanceInput): Promise<FinanceOutput> {
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

FRAMEWORK: Golden Circle (WHY → HOW → WHAT) y Brand Archetypes: elige 1–2 arquetipos coherentes y mantén voz, metáforas y promesa con tensión emocional sin vacuidad.

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: finance con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para finance con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: finance con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para finance con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Thought leadership financiero "${enriched.companyName}" (${enriched.serviceType}, ${enriched.targetClient}, tono ${enriched.tone}):
- Artículo opinión estilo Expansión/Cinco Días/El Economista (tesis prudentes datos genéricos).
- Guión podcast/vídeo 10 min tema actual mercado fiscal sin recomendación personalizada.
- Hilo LinkedIn 6-10 posts tema legislación o mercado reciente placeholders.
- Plantilla ponencia jornadas financieras (título audiencia bloques KPI).
- Bio ejecutiva conferencias (versión corta/larga).
- Estrategia LinkedIn para EAFIs/asesores independientes: calendario y compliance publicitario.
No constituye asesoramiento de inversión.`;
    const __crmOut = { agentId: "finance-thought-leadership", result: await this.llm.complete(prompt, financeLlmOpts(0.4)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "finance",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let financeThoughtLeadershipCached: FinanceThoughtLeadershipAgent | undefined;
export function getFinanceThoughtLeadershipAgent(): FinanceThoughtLeadershipAgent { if (!financeThoughtLeadershipCached) financeThoughtLeadershipCached = new FinanceThoughtLeadershipAgent(); return financeThoughtLeadershipCached; }
export function resetFinanceThoughtLeadershipAgentForTests(): void { financeThoughtLeadershipCached = undefined; }
