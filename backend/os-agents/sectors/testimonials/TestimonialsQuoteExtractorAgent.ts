import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-quote-extractor";

export class TestimonialsQuoteExtractorAgent {
  private static inst: TestimonialsQuoteExtractorAgent | undefined;

  static get instance(): TestimonialsQuoteExtractorAgent {
    if (!TestimonialsQuoteExtractorAgent.inst) TestimonialsQuoteExtractorAgent.inst = new TestimonialsQuoteExtractorAgent();
    return TestimonialsQuoteExtractorAgent.inst;
  }

  static reset(): void {
    TestimonialsQuoteExtractorAgent.inst = undefined;
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
          "ROLE: Pull-quote specialist top 1%; frases cortas con gancho para conversión.",
        mission:
          "Genera citas de impacto para landing, ads y hero; variantes de longitud y tono.",
        fewShotExample:
          "Input: CEO SaaS. Output JSON: quotes 15-40 palabras; formats carousel LinkedIn.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsQuoteExtractorAgent(): TestimonialsQuoteExtractorAgent {
  return TestimonialsQuoteExtractorAgent.instance;
}

export function resetTestimonialsQuoteExtractorAgentForTests(): void {
  TestimonialsQuoteExtractorAgent.reset();
}
