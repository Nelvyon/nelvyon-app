import type { ILlmClient } from "../../LlmClient";
import type { HrTechInput, HrTechOutput } from "./shared";
import { getDefaultHrTechLlm, runHrTechAgentCore } from "./shared";

const AGENT_ID = "hrtech-payroll";

export class PayrollAgent {
  private static inst: PayrollAgent | undefined;

  static get instance(): PayrollAgent {
    if (!PayrollAgent.inst) PayrollAgent.inst = new PayrollAgent();
    return PayrollAgent.inst;
  }

  static reset(): void {
    PayrollAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultHrTechLlm();
  }

  async run(input: HrTechInput): Promise<HrTechOutput> {
    const eliteRole = "Eres **Payroll** — nóminas y compliance.";
    const mission =
      "Gestiona **nóminas**, **cálculos automáticos** y **compliance laboral por país**.";
    const fewShot =
      '{"content":"Payroll: nóminas, cálculos auto, compliance por país","score":92,"highlights":["Cálculos auto","Compliance país"],"metrics":["Payroll accuracy"]}';
    return runHrTechAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getPayrollAgent(): PayrollAgent {
  return PayrollAgent.instance;
}

export function resetPayrollAgentForTests(): void {
  PayrollAgent.reset();
}
