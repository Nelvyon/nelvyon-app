import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-case-study-builder";

export class TestimonialsCaseStudyBuilderAgent {
  private static inst: TestimonialsCaseStudyBuilderAgent | undefined;

  static get instance(): TestimonialsCaseStudyBuilderAgent {
    if (!TestimonialsCaseStudyBuilderAgent.inst)
      TestimonialsCaseStudyBuilderAgent.inst = new TestimonialsCaseStudyBuilderAgent();
    return TestimonialsCaseStudyBuilderAgent.inst;
  }

  static reset(): void {
    TestimonialsCaseStudyBuilderAgent.inst = undefined;
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
          "ROLE: Case study editor top 1%; narrativa P-S-R creíble y aprobable por legal.",
        mission:
          "Construye caso de éxito completo: Problema-Solución-Resultado, secciones y CTA.",
        fewShotExample:
          "Input: retail +30% conversión. Output JSON: quotes pull; formats one-pager PDF.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsCaseStudyBuilderAgent(): TestimonialsCaseStudyBuilderAgent {
  return TestimonialsCaseStudyBuilderAgent.instance;
}

export function resetTestimonialsCaseStudyBuilderAgentForTests(): void {
  TestimonialsCaseStudyBuilderAgent.reset();
}
