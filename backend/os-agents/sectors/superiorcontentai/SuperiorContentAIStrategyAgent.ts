import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-strategy";

export class SuperiorContentAIStrategyAgent {
  private static inst: SuperiorContentAIStrategyAgent | undefined;

  static get instance(): SuperiorContentAIStrategyAgent {
    if (!SuperiorContentAIStrategyAgent.inst) SuperiorContentAIStrategyAgent.inst = new SuperiorContentAIStrategyAgent();
    return SuperiorContentAIStrategyAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIStrategyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Strategy** — estrategia de contenido.";
    const mission =
      "Diseña **estrategia por sector/audiencia/objetivos**, pilares temáticos y **calendario 90 días** con voz de marca.";
    const fewShot =
      '{"content":"90-day content strategy pillars audience objectives brand voice","score":90,"highlights":["90-day calendar","Thematic pillars"],"metrics":["Strategy coverage"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorContentAIStrategyAgent(): SuperiorContentAIStrategyAgent {
  return SuperiorContentAIStrategyAgent.instance;
}

export function resetSuperiorContentAIStrategyAgentForTests(): void {
  SuperiorContentAIStrategyAgent.reset();
}
