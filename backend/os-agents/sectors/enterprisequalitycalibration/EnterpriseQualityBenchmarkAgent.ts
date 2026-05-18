import type { ILlmClient } from "../../LlmClient";
import type { EnterpriseQualityCalibrationInput, EnterpriseQualityCalibrationOutput } from "./shared";
import { getDefaultEnterpriseQualityCalibrationLlm, runEnterpriseQualityCalibrationAgentCore } from "./shared";

const AGENT_ID = "enterprisequalitycalibration-benchmark";

export class EnterpriseQualityBenchmarkAgent {
  private static inst: EnterpriseQualityBenchmarkAgent | undefined;

  static get instance(): EnterpriseQualityBenchmarkAgent {
    if (!EnterpriseQualityBenchmarkAgent.inst) EnterpriseQualityBenchmarkAgent.inst = new EnterpriseQualityBenchmarkAgent();
    return EnterpriseQualityBenchmarkAgent.inst;
  }

  static reset(): void {
    EnterpriseQualityBenchmarkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultEnterpriseQualityCalibrationLlm();
  }

  async run(input: EnterpriseQualityCalibrationInput): Promise<EnterpriseQualityCalibrationOutput> {
    const eliteRole = "Eres **EnterpriseQuality Benchmark** — benchmarking mundial.";
    const mission =
      "Benchmark vs **top 1% mundial** por categoría con **percentil industria**.";
    const fewShot =
      '{"content":"World top 1% category benchmark industry percentile","score":90,"highlights":["Top 1% benchmark","Industry percentile"],"metrics":["Benchmark percentile"]}';
    return runEnterpriseQualityCalibrationAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getEnterpriseQualityBenchmarkAgent(): EnterpriseQualityBenchmarkAgent {
  return EnterpriseQualityBenchmarkAgent.instance;
}

export function resetEnterpriseQualityBenchmarkAgentForTests(): void {
  EnterpriseQualityBenchmarkAgent.reset();
}
