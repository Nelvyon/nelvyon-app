import type { ILlmClient } from "../../LlmClient";
import type { TestimonialsInput, TestimonialsOutput } from "./shared";
import { getDefaultTestimonialsLlm, runTestimonialsAgentCore } from "./shared";

const AGENT_ID = "testimonials-roi-calculator";

export class TestimonialsROICalculatorAgent {
  private static inst: TestimonialsROICalculatorAgent | undefined;

  static get instance(): TestimonialsROICalculatorAgent {
    if (!TestimonialsROICalculatorAgent.inst) TestimonialsROICalculatorAgent.inst = new TestimonialsROICalculatorAgent();
    return TestimonialsROICalculatorAgent.inst;
  }

  static reset(): void {
    TestimonialsROICalculatorAgent.inst = undefined;
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
          "ROLE: Value quant analyst top 1%; ROI solo con supuestos explícitos.",
        mission:
          "Cuantifica y presenta ROI del cliente: supuestos, fórmulas simples y disclaimer.",
        fewShotExample:
          "Input: ahorro horas. Output JSON: quotes cifra + contexto; formats slide ejecutivo.",
      },
      input,
      0.2,
    );
  }
}

export function getTestimonialsROICalculatorAgent(): TestimonialsROICalculatorAgent {
  return TestimonialsROICalculatorAgent.instance;
}

export function resetTestimonialsROICalculatorAgentForTests(): void {
  TestimonialsROICalculatorAgent.reset();
}
