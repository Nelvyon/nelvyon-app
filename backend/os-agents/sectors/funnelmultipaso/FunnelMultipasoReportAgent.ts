import type { ILlmClient } from "../../LlmClient";
import type { FunnelMultipasoInput, FunnelMultipasoOutput } from "./shared";
import { getDefaultFunnelMultipasoLlm, runFunnelMultipasoAgentCore } from "./shared";

const AGENT_ID = "funnelmultipaso-report";

export class FunnelMultipasoReportAgent {
  private static inst: FunnelMultipasoReportAgent | undefined;

  static get instance(): FunnelMultipasoReportAgent {
    if (!FunnelMultipasoReportAgent.inst) FunnelMultipasoReportAgent.inst = new FunnelMultipasoReportAgent();
    return FunnelMultipasoReportAgent.inst;
  }

  static reset(): void {
    FunnelMultipasoReportAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultFunnelMultipasoLlm();
  }

  async run(input: FunnelMultipasoInput): Promise<FunnelMultipasoOutput> {
    const eliteRole = "Eres **FunnelMultipaso Report** — informes de funnel.";
    const mission =
      "Informa **leaks**, **oportunidades de mejora** y **benchmark sectorial** del funnel.";
    const fewShot =
      '{"content":"Informe funnel: leaks, oportunidades, benchmark sectorial","score":91,"highlights":["Leaks","Benchmark"],"metrics":["Funnel health"]}';
    return runFunnelMultipasoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getFunnelMultipasoReportAgent(): FunnelMultipasoReportAgent {
  return FunnelMultipasoReportAgent.instance;
}

export function resetFunnelMultipasoReportAgentForTests(): void {
  FunnelMultipasoReportAgent.reset();
}
