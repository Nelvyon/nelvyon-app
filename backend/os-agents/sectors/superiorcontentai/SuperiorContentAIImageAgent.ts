import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-image";

export class SuperiorContentAIImageAgent {
  private static inst: SuperiorContentAIImageAgent | undefined;

  static get instance(): SuperiorContentAIImageAgent {
    if (!SuperiorContentAIImageAgent.inst) SuperiorContentAIImageAgent.inst = new SuperiorContentAIImageAgent();
    return SuperiorContentAIImageAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIImageAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Image** — prompts y directrices visuales.";
    const mission =
      "Genera **prompts optimizados** para imágenes y **directrices visuales** por pieza alineadas a la marca.";
    const fewShot =
      '{"content":"Optimized image prompts visual guidelines per asset brand-aligned","score":88,"highlights":["Image prompts","Visual guidelines"],"metrics":["Visual consistency"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.6);
  }
}

export function getSuperiorContentAIImageAgent(): SuperiorContentAIImageAgent {
  return SuperiorContentAIImageAgent.instance;
}

export function resetSuperiorContentAIImageAgentForTests(): void {
  SuperiorContentAIImageAgent.reset();
}
