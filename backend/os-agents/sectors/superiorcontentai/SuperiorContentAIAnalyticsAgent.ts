import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-analytics";

export class SuperiorContentAIAnalyticsAgent {
  private static inst: SuperiorContentAIAnalyticsAgent | undefined;

  static get instance(): SuperiorContentAIAnalyticsAgent {
    if (!SuperiorContentAIAnalyticsAgent.inst) SuperiorContentAIAnalyticsAgent.inst = new SuperiorContentAIAnalyticsAgent();
    return SuperiorContentAIAnalyticsAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Analytics** — performance de contenido.";
    const mission =
      "Mide **tiempo lectura, scroll, shares y leads** por pieza; engagement objetivo **>5%**.";
    const fewShot =
      '{"content":"Read time scroll shares leads per asset engagement >5%","score":90,"highlights":[">5% engagement","Per-asset leads"],"metrics":["Engagement rate"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorContentAIAnalyticsAgent(): SuperiorContentAIAnalyticsAgent {
  return SuperiorContentAIAnalyticsAgent.instance;
}

export function resetSuperiorContentAIAnalyticsAgentForTests(): void {
  SuperiorContentAIAnalyticsAgent.reset();
}
