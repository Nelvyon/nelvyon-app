import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { llmOpts, parseJson } from "./shared";

export type CustomerSuccessEmailInput = { customerType: string; onboardingGoal: string; product: string };
export type CustomerSuccessEmailResult = { onboardingSequence: Array<{ stage: string; subject: string; body: string }>; upsellTouchpoint: string; renewalTouchpoint: string };
export type CustomerSuccessEmailAgentDeps = { llm?: ILlmClient };
export class CustomerSuccessEmailAgent {
  constructor(private readonly deps: CustomerSuccessEmailAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async createCustomerSuccessSequence(userId: string, input: CustomerSuccessEmailInput): Promise<CustomerSuccessEmailResult> {
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

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"onboardingSequence":[{"stage":"","subject":"","body":""}],"upsellTouchpoint":"","renewalTouchpoint":""}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: b2b con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para b2b con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: b2b con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para b2b con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Crea secuencia customer success B2B para ${enriched.product}, tipo cliente ${enriched.customerType}, objetivo onboarding ${enriched.onboardingGoal}. Incluye bienvenida, hitos, check-ins, upsell y renovación. SOLO JSON {"onboardingSequence":[{"stage":"","subject":"","body":""}],"upsellTouchpoint":"","renewalTouchpoint":""}`;
    return parseJson<CustomerSuccessEmailResult>(await this.llm.complete(prompt, llmOpts(0.5)), "CustomerSuccessEmailAgent");
  }
}
let cached: CustomerSuccessEmailAgent | undefined;
export function getCustomerSuccessEmailAgent(): CustomerSuccessEmailAgent { if (!cached) cached = new CustomerSuccessEmailAgent(); return cached; }
export function resetCustomerSuccessEmailAgentForTests(): void { cached = undefined; }

