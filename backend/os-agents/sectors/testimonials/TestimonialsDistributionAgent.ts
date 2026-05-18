import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-distribution";

export class TestimonialsDistributionAgent {
  private static inst: TestimonialsDistributionAgent | undefined;

  static get instance(): TestimonialsDistributionAgent {
    if (!TestimonialsDistributionAgent.inst) TestimonialsDistributionAgent.inst = new TestimonialsDistributionAgent();
    return TestimonialsDistributionAgent.inst;
  }

  static reset(): void {
    TestimonialsDistributionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTestimonialsLlm();
  }

  async run(input: TestimonialsInput): Promise<TestimonialsOutput> {
    return runTestimonialsAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Content distribution PM top 1%; canales y cadencia sin fatiga.",
        mission:
          "Crea plan multicanal para el caso de éxito: owned, earned, paid y repurposing.",
        fewShotExample:
          "Input: caso B2B. Output JSON: quotes por canal; formats newsletter + webinar + sales deck.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsDistributionAgent(): TestimonialsDistributionAgent {
  return TestimonialsDistributionAgent.instance;
}

export function resetTestimonialsDistributionAgentForTests(): void {
  TestimonialsDistributionAgent.reset();
}
