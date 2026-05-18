import type { ILlmClient } from "../../LlmClient";
import type { MultiCurrencyInput, MultiCurrencyOutput } from "./shared";
import { getDefaultMultiCurrencyLlm, runMultiCurrencyAgentCore } from "./shared";

const AGENT_ID = "multicurrency-report";

export class MultiCurrencyReportAgent {
  private static inst: MultiCurrencyReportAgent | undefined;

  static get instance(): MultiCurrencyReportAgent {
    if (!MultiCurrencyReportAgent.inst) MultiCurrencyReportAgent.inst = new MultiCurrencyReportAgent();
    return MultiCurrencyReportAgent.inst;
  }

  static reset(): void {
    MultiCurrencyReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultMultiCurrencyLlm();
  }

  async run(input: MultiCurrencyInput): Promise<MultiCurrencyOutput> {
    return runMultiCurrencyAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: FP&A; reporting interno siempre normalizado a EUR.",
        mission:
          "Consolida ingresos multimoneda a EUR para reporting interno (FX medio período, reconciliación orientativa).",
        fewShotExample:
          '{"content":"MRR EUR consolidado desde USD/MXN/ARS.","score":90,"highlights":["Base EUR reporting","FX medio"],"metrics":["EUR total"]}',
      },
      input,
      0.1,
    );
  }
}

export function getMultiCurrencyReportAgent(): MultiCurrencyReportAgent {
  return MultiCurrencyReportAgent.instance;
}

export function resetMultiCurrencyReportAgentForTests(): void {
  MultiCurrencyReportAgent.reset();
}
