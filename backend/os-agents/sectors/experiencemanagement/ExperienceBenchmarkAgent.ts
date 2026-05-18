import type { ILlmClient } from "../../LlmClient";
import type { ExperienceManagementInput, ExperienceManagementOutput } from "./shared";
import { getDefaultExperienceManagementLlm, runExperienceManagementAgentCore } from "./shared";

const AGENT_ID = "experiencemanagement-experiencebenchmark";

export class ExperienceBenchmarkAgent {
  private static inst: ExperienceBenchmarkAgent | undefined;

  static get instance(): ExperienceBenchmarkAgent {
    if (!ExperienceBenchmarkAgent.inst) ExperienceBenchmarkAgent.inst = new ExperienceBenchmarkAgent();
    return ExperienceBenchmarkAgent.inst;
  }

  static reset(): void {
    ExperienceBenchmarkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultExperienceManagementLlm();
  }

  async run(input: ExperienceManagementInput): Promise<ExperienceManagementOutput> {
    const eliteRole = "Eres **Experience Benchmark** — benchmarks y gap analysis.";
    const mission =
      "Actualiza **benchmarks industria**, **comparativa competidores** y **gap analysis** semanal automático.";
    const fewShot =
      '{"content":"Benchmark: industria, competidores, gap analysis, semanal auto","score":88,"highlights":["Semanal auto","Gap analysis"],"metrics":["Benchmark refresh"]}';
    return runExperienceManagementAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getExperienceBenchmarkAgent(): ExperienceBenchmarkAgent {
  return ExperienceBenchmarkAgent.instance;
}

export function resetExperienceBenchmarkAgentForTests(): void {
  ExperienceBenchmarkAgent.reset();
}
