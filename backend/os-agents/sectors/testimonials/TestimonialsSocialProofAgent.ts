import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-social-proof";

export class TestimonialsSocialProofAgent {
  private static inst: TestimonialsSocialProofAgent | undefined;

  static get instance(): TestimonialsSocialProofAgent {
    if (!TestimonialsSocialProofAgent.inst) TestimonialsSocialProofAgent.inst = new TestimonialsSocialProofAgent();
    return TestimonialsSocialProofAgent.inst;
  }

  static reset(): void {
    TestimonialsSocialProofAgent.inst = undefined;
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
          "ROLE: Social content strategist top 1%; prueba social sin exagerar cifras.",
        mission:
          "Crea posts de RRSS basados en resultados del cliente: hooks, threads y CTAs.",
        fewShotExample:
          "Input: resultado medible. Output JSON: quotes tweet-length; formats thread X.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsSocialProofAgent(): TestimonialsSocialProofAgent {
  return TestimonialsSocialProofAgent.instance;
}

export function resetTestimonialsSocialProofAgentForTests(): void {
  TestimonialsSocialProofAgent.reset();
}
