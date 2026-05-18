import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { llmOpts, parseJson } from "./shared";

export type AthletePersonalBrandInput = { athleteName: string; sport: string; goals: string };
export type AthletePersonalBrandResult = {
  narrative: string;
  values: string[];
  differentiators: string[];
  tone: string;
  contentPlanByPlatform: Array<{ platform: string; pillars: string[] }>;
};
export type AthletePersonalBrandAgentDeps = { llm?: ILlmClient };

export class AthletePersonalBrandAgent {
  constructor(private readonly deps: AthletePersonalBrandAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async buildBrand(userId: string, input: AthletePersonalBrandInput): Promise<AthletePersonalBrandResult> {
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
El output debe sorprender al lector. Golden Circle (WHY → HOW → WHAT) y Brand Archetypes: elige 1–2 arquetipos coherentes y mantén voz, metáforas y promesa con tensión emocional sin vacuidad.

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"narrative":"","values":[],"differentiators":[],"tone":"","contentPlanByPlatform":[{"platform":"","pillars":[]}]}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: sports con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para sports con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: sports con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para sports con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Crea estrategia de marca personal deportiva elite para ${enriched.athleteName} (${enriched.sport}). Objetivos: ${enriched.goals}. Usa frameworks Real Madrid/Nike Athletes/Team Liquid. SOLO JSON {"narrative":"","values":[],"differentiators":[],"tone":"","contentPlanByPlatform":[{"platform":"","pillars":[]}]}`;
    return parseJson<AthletePersonalBrandResult>(await this.llm.complete(prompt, llmOpts(0.9)), "AthletePersonalBrandAgent");
  }
}
let cached: AthletePersonalBrandAgent | undefined;
export function getAthletePersonalBrandAgent(): AthletePersonalBrandAgent { if (!cached) cached = new AthletePersonalBrandAgent(); return cached; }
export function resetAthletePersonalBrandAgentForTests(): void { cached = undefined; }

