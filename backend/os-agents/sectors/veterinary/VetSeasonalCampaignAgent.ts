import type { ILlmClient } from "../../LlmClient";
import { LearningService } from "../../learning/LearningService";
import { tryLogCrmAgentOutput } from "../../crm/agentRunHook";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import type { VetInput, VetOutput } from "./shared";
import { vetLlmOpts } from "./shared";

export type VetSeasonalCampaignAgentDeps = { llm?: ILlmClient };
export class VetSeasonalCampaignAgent {
  constructor(private readonly deps: VetSeasonalCampaignAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async run(userId: string, input: VetInput): Promise<VetOutput> {
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
Sé original, específico y evita cualquier cliché.
El output debe sorprender al lector. Usa StoryBrand SB7 (héroe, problema, guía, plan, llamada a la acción, éxito, fracaso a evitar) y Value Ladder (entrada de valor → oferta central → ascenso) para estructurar mensajes y CTAs coherentes.

OUTPUT FORMAT: Responde en español salvo que el brief pida otro idioma. Usa secciones con encabezados ###, bullets densos donde aporte, y checklist o próximos pasos cuando sea útil. Longitud acorde a la tarea (ni genérico ni verboso).

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: veterinary con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para veterinary con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: veterinary con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para veterinary con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Campañas estacionales "${enriched.businessName}" (${enriched.serviceType}, ${enriched.targetPet}, ${enriched.tone}, ${enriched.location ?? "multi"}).
Por campaña: mensaje clave canales mostrador RRSS email WA sin prescripción medicamentos en copy masivo.
- Primavera desparasitación alergias garrapatas prevención general.
- Verano golpe calor viajes hidratación sombra nunca dejar en coche.
- Otoño vacunas revisión pre-invierno lenguaje informativo.
- Invierno frío movilidad senior nutrición orientación visita clínica.
- Navidad adopción responsable regalos tienda parafarmacia veterinaria.
Incluir CTA cita y aviso consultar siempre con veterinario.`;
    const __crmOut = { agentId: "vet-seasonal-campaign", result: await this.llm.complete(prompt, vetLlmOpts(0.9)), generatedAt: new Date().toISOString() };
    await tryLogCrmAgentOutput(userId, input, __crmOut);
    try {
      await new LearningService().recordOutcome(
        userId,
        __crmOut.agentId,
        "veterinary",
        input,
        __crmOut,
        "generated",
      );
    } catch {}
    return __crmOut;
  }
}
let vetSeasonalCampaignCached: VetSeasonalCampaignAgent | undefined;
export function getVetSeasonalCampaignAgent(): VetSeasonalCampaignAgent { if (!vetSeasonalCampaignCached) vetSeasonalCampaignCached = new VetSeasonalCampaignAgent(); return vetSeasonalCampaignCached; }
export function resetVetSeasonalCampaignAgentForTests(): void { vetSeasonalCampaignCached = undefined; }
