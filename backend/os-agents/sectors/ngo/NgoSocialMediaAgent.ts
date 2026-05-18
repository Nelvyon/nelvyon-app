import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { NgoInput, NgoOutput } from "./shared";
import { ngoLlmOpts } from "./shared";

export type NgoSocialMediaAgentDeps = { llm?: ILlmClient };
export class NgoSocialMediaAgent {
  constructor(private readonly deps: NgoSocialMediaAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: NgoInput): Promise<NgoOutput> {
    const enriched = (await ClientProfileService.enrichInput(
    userId,
    String((input as { brandName?: string }).brandName ?? ""),
    input as object,
    )) as typeof input & { _clientProfileBrief?: string };

    const geo = enriched.country ?? "multi";
        

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
Input: ngo con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para ngo con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: ngo con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para ngo con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
RRSS tercer sector "${enriched.organizationName}" (causa ${enriched.cause}, audiencia ${enriched.targetAudience}, tono ${enriched.tone}, territorio ${geo}):
- 20 ideas contenido: historias con permiso formal, métricas impacto, BTS equipo, voluntariado días campo, hitos.
- Captions hashtags causa + zona.
- Stories campaña secuencias plantilla.
- Guión vídeo corto emotivo dignidad protagonista anonimización rostros menor edad especial cuidado.
- Calendario mensual editorial.
- Normas representación personas vulnerables: consentimiento informado, dignidad, anonimización cuando proceda.`;
    const __crmOut = { agentId: "ngo-social-media", result: await this.llm.complete(prompt, ngoLlmOpts(0.7)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "ngo",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let ngoSocialMediaCached: NgoSocialMediaAgent | undefined;
export function getNgoSocialMediaAgent(): NgoSocialMediaAgent { if (!ngoSocialMediaCached) ngoSocialMediaCached = new NgoSocialMediaAgent(); return ngoSocialMediaCached; }
export function resetNgoSocialMediaAgentForTests(): void { ngoSocialMediaCached = undefined; }
