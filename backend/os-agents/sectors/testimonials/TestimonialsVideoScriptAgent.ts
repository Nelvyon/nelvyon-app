import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-video-script";

export class TestimonialsVideoScriptAgent {
  private static inst: TestimonialsVideoScriptAgent | undefined;

  static get instance(): TestimonialsVideoScriptAgent {
    if (!TestimonialsVideoScriptAgent.inst) TestimonialsVideoScriptAgent.inst = new TestimonialsVideoScriptAgent();
    return TestimonialsVideoScriptAgent.inst;
  }

  static reset(): void {
    TestimonialsVideoScriptAgent.inst = undefined;
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
          "ROLE: Video testimonial director top 1%; ritmo y B-roll sugerido.",
        mission:
          "Escribe script de video testimonial: hook, preguntas, payoff y supers.",
        fewShotExample:
          "Input: 60s testimonio. Output JSON: quotes para supers; formats vertical 9:16.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsVideoScriptAgent(): TestimonialsVideoScriptAgent {
  return TestimonialsVideoScriptAgent.instance;
}

export function resetTestimonialsVideoScriptAgentForTests(): void {
  TestimonialsVideoScriptAgent.reset();
}
