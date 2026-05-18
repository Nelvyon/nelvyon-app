import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-comparison";

export class TestimonialsComparisonAgent {
  private static inst: TestimonialsComparisonAgent | undefined;

  static get instance(): TestimonialsComparisonAgent {
    if (!TestimonialsComparisonAgent.inst) TestimonialsComparisonAgent.inst = new TestimonialsComparisonAgent();
    return TestimonialsComparisonAgent.inst;
  }

  static reset(): void {
    TestimonialsComparisonAgent.inst = undefined;
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
          "ROLE: Before/after storyteller top 1%; datos solo si el brief los trae.",
        mission:
          "Genera comparativa antes/después con métricas concretas del brief o marcadas como estimación.",
        fewShotExample:
          "Input: lead time reducido. Output JSON: quotes contraste; formats tabla comparativa.",
      },
      input,
      0.2,
    );
  }
}

export function getTestimonialsComparisonAgent(): TestimonialsComparisonAgent {
  return TestimonialsComparisonAgent.instance;
}

export function resetTestimonialsComparisonAgentForTests(): void {
  TestimonialsComparisonAgent.reset();
}
