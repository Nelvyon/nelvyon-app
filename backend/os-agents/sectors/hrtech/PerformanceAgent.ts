import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-performance";

export class PerformanceAgent {
  private static inst: PerformanceAgent | undefined;

  static get instance(): PerformanceAgent {
    if (!PerformanceAgent.inst) PerformanceAgent.inst = new PerformanceAgent();
    return PerformanceAgent.inst;
  }

  static reset(): void {
    PerformanceAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Performance** — rendimiento y OKRs.";
    const mission =
      "Ejecuta **evaluaciones de rendimiento automáticas**, **OKRs por empleado** y **feedback continuo**.";
    const fewShot =
      '{"content":"Performance: evaluaciones auto, OKRs, feedback continuo","score":93,"highlights":["OKRs empleado","Feedback continuo"],"metrics":["Performance score"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getPerformanceAgent(): PerformanceAgent {
  return PerformanceAgent.instance;
}

export function resetPerformanceAgentForTests(): void {
  PerformanceAgent.reset();
}
