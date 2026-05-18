import type { ILlmClient } from "../../LlmClient";
import { ClientProfileService } from "../../client-profile";
import { LlmClient } from "../../LlmClient";
import { GenerativeClient } from "../../generative/GenerativeClient";
import { llmOpts, parseJson } from "./shared";

export type PropertyPhotoPromptInput = { propertyType: string; style: string; keySellingPoints: string[] };
export type PropertyPhotoPromptResult = { prompt: string; virtualStagingNotes: string[]; heroShotGuidance: string; imageUrl: string };
export type PropertyPhotoPromptAgentDeps = { llm?: ILlmClient; generateImage?: typeof GenerativeClient.generateImage };
export class PropertyPhotoPromptAgent {
  constructor(private readonly deps: PropertyPhotoPromptAgentDeps = {}) {}
  private get llm(): ILlmClient { return this.deps.llm ?? LlmClient.getInstance(); }
  async generatePhotoPrompt(userId: string, input: PropertyPhotoPromptInput): Promise<PropertyPhotoPromptResult> {
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

FRAMEWORK: Jobs To Be Done (jobs funcionales, emocionales y sociales), desglose MECE de la propuesta, y OKR de ejemplo (1 objetivo + 2–3 resultados clave medibles o auditables cualitativamente).

OUTPUT FORMAT: Respuesta ÚNICAMENTE como JSON válido UTF-8, sin markdown ni texto antes/después. Esquema: {"prompt":"","virtualStagingNotes":[],"heroShotGuidance":""}

QUALITY BAR: Nivel de calidad: top 1% mundial. Cada output debe ser accionable, específico y superior a cualquier herramienta genérica del mercado. Sin relleno: donde falte dato usa [PLACEHOLDER] con instrucción breve de cómo completarlo. Respeta compliance sectorial y marcas legales cuando aplique.

### EJEMPLOS DE CALIDAD ÉLITE
Ejemplo 1:
Input: realestate con datos reales: presupuesto 3500 EUR, objetivo 42 leads cualificados en 30 dias, audiencia principal 30-45, ciudad principal y KPI historico CTR 2.1%.
Output: Plan especifico para realestate con hipotesis cuantificada, copy exacto por canal, cadencia semanal y criterio de corte por KPI. Incluye segmentacion, mensaje principal y accion concreta del dia 1 al dia 7.

Ejemplo 2:
Input: realestate con estacionalidad alta, ticket medio 120 EUR, margen 38%, base activa 1800 contactos, objetivo subir conversion un 18% sin aumentar CPC.
Output: Propuesta accionable para realestate con dos variantes diferenciadas, ofertas con limites claros, calendario por franja horaria y mecanismo de seguimiento con metrica objetivo por etapa.
### FIN EJEMPLOS

### BRIEF OPERATIVO
Genera prompt DALL-E para visual de inmueble (${enriched.propertyType}, estilo ${enriched.style}, puntos ${(enriched.keySellingPoints ?? []).join(", ")}). Incluye staging virtual y hero shot para portales. SOLO JSON {"prompt":"","virtualStagingNotes":[],"heroShotGuidance":""}`;
    const parsed = parseJson<{ prompt: string; virtualStagingNotes: string[]; heroShotGuidance: string }>(await this.llm.complete(prompt, llmOpts(0.4)), "PropertyPhotoPromptAgent");
    const gen = this.deps.generateImage ?? GenerativeClient.generateImage.bind(GenerativeClient);
    const img = await gen(parsed.prompt, { size: "1792x1024", quality: "hd" });
    return { ...parsed, imageUrl: img.url };
  }
}
let cached: PropertyPhotoPromptAgent | undefined;
export function getPropertyPhotoPromptAgent(): PropertyPhotoPromptAgent { if (!cached) cached = new PropertyPhotoPromptAgent(); return cached; }
export function resetPropertyPhotoPromptAgentForTests(): void { cached = undefined; }

