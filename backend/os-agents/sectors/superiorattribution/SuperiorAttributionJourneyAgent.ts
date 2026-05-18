import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-journey";

export class SuperiorAttributionJourneyAgent {
  private static inst: SuperiorAttributionJourneyAgent | undefined;

  static get instance(): SuperiorAttributionJourneyAgent {
    if (!SuperiorAttributionJourneyAgent.inst) SuperiorAttributionJourneyAgent.inst = new SuperiorAttributionJourneyAgent();
    return SuperiorAttributionJourneyAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionJourneyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Journey** — customer journey.";
    const mission =
      "Mapea el **customer journey completo** y **touchpoints hasta conversión** sin huecos direct/none.";
    const fewShot =
      '{"content":"Full customer journey touchpoints to conversion no direct none gaps","score":89,"highlights":["Journey map","Touchpoint coverage"],"metrics":["Journey completeness"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorAttributionJourneyAgent(): SuperiorAttributionJourneyAgent {
  return SuperiorAttributionJourneyAgent.instance;
}

export function resetSuperiorAttributionJourneyAgentForTests(): void {
  SuperiorAttributionJourneyAgent.reset();
}
