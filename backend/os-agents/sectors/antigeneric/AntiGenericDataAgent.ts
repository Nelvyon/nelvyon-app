import type { ILlmClient } from "../../LlmClient";
import type { AntiGenericInput, AntiGenericOutput } from "./shared";
import { getDefaultAntiGenericLlm, runAntiGenericAgentCore } from "./shared";

const AGENT_ID = "antigeneric-data";

export class AntiGenericDataAgent {
  private static inst: AntiGenericDataAgent | undefined;

  static get instance(): AntiGenericDataAgent {
    if (!AntiGenericDataAgent.inst) AntiGenericDataAgent.inst = new AntiGenericDataAgent();
    return AntiGenericDataAgent.inst;
  }

  static reset(): void {
    AntiGenericDataAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultAntiGenericLlm();
  }

  async run(input: AntiGenericInput): Promise<AntiGenericOutput> {
    const eliteRole =
      "Eres **AntiGeneric Data Enricher** — métricas, benchmarks y nombres verificables.";
    const mission =
      "Enriquece outputs con **datos reales**: **métricas**, **benchmarks** y **nombres** del cliente/sector; prohibido ROI sin cifra.";
    const fewShot =
      '{"content":"Add benchmark 18%→24% conversion + brand name","score":89,"highlights":["Real metric","Named entity"],"metrics":["Data density"]}';
    return runAntiGenericAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getAntiGenericDataAgent(): AntiGenericDataAgent {
  return AntiGenericDataAgent.instance;
}

export function resetAntiGenericDataAgentForTests(): void {
  AntiGenericDataAgent.reset();
}
