import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-outreach-request";

export class TestimonialsOutreachRequestAgent {
  private static inst: TestimonialsOutreachRequestAgent | undefined;

  static get instance(): TestimonialsOutreachRequestAgent {
    if (!TestimonialsOutreachRequestAgent.inst)
      TestimonialsOutreachRequestAgent.inst = new TestimonialsOutreachRequestAgent();
    return TestimonialsOutreachRequestAgent.inst;
  }

  static reset(): void {
    TestimonialsOutreachRequestAgent.inst = undefined;
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
          "ROLE: Customer success comms top 1%; pedir testimonio con respeto y facilidad.",
        mission:
          "Redacta mensaje personalizado para pedir testimonio: email/DM, guion breve y enlace.",
        fewShotExample:
          "Input: cliente satisfecho post-entrega. Output JSON: quotes sugeridas aprobar; formats email corto.",
      },
      input,
      0.5,
    );
  }
}

export function getTestimonialsOutreachRequestAgent(): TestimonialsOutreachRequestAgent {
  return TestimonialsOutreachRequestAgent.instance;
}

export function resetTestimonialsOutreachRequestAgentForTests(): void {
  TestimonialsOutreachRequestAgent.reset();
}
