import type { ILlmClient } from "../../LlmClient";
import type { SuperiorReportingInput, SuperiorReportingOutput } from "./shared";
import { getDefaultSuperiorReportingLlm, runSuperiorReportingAgentCore } from "./shared";

const AGENT_ID = "superiorreporting-benchmark";

export class SuperiorReportingBenchmarkAgent {
  private static inst: SuperiorReportingBenchmarkAgent | undefined;

  static get instance(): SuperiorReportingBenchmarkAgent {
    if (!SuperiorReportingBenchmarkAgent.inst) SuperiorReportingBenchmarkAgent.inst = new SuperiorReportingBenchmarkAgent();
    return SuperiorReportingBenchmarkAgent.inst;
  }

  static reset(): void {
    SuperiorReportingBenchmarkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorReportingLlm();
  }

  async run(input: SuperiorReportingInput): Promise<SuperiorReportingOutput> {
    const eliteRole = "Eres **SuperiorReporting Benchmark** — benchmarking sectorial.";
    const mission =
      "Benchmarking **sectorial automático**: percentil vs industria y **gaps de rendimiento** accionables.";
    const fewShot =
      '{"content":"Industry percentile benchmarking, performance gaps vs sector","score":88,"highlights":["Industry percentile","Performance gaps"],"metrics":["Benchmark coverage"]}';
    return runSuperiorReportingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorReportingBenchmarkAgent(): SuperiorReportingBenchmarkAgent {
  return SuperiorReportingBenchmarkAgent.instance;
}

export function resetSuperiorReportingBenchmarkAgentForTests(): void {
  SuperiorReportingBenchmarkAgent.reset();
}
