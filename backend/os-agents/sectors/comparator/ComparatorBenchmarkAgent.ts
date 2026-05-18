import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-benchmark";

export class ComparatorBenchmarkAgent {
  private static inst: ComparatorBenchmarkAgent | undefined;

  static get instance(): ComparatorBenchmarkAgent {
    if (!ComparatorBenchmarkAgent.inst) ComparatorBenchmarkAgent.inst = new ComparatorBenchmarkAgent();
    return ComparatorBenchmarkAgent.inst;
  }

  static reset(): void {
    ComparatorBenchmarkAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultComparatorLlm();
  }

  async run(input: ComparatorInput): Promise<ComparatorOutput> {
    return runComparatorAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Benchmark sectorial top 1%; contrasta resultados del cliente con referencias típicas sin inventar datasets.",
        mission:
          "Compara resultados del cliente vs benchmark del sector declarado: percentiles cualitativos, gaps y ventajas competitivas.",
        fewShotExample:
          '{"content":"Then: sector SaaS B2B del brief. Results: cliente NRR 112% vs típico 105–115% en peers maduros. Achieved: por encima del punto medio. Numbers: solo rangos cualitativos si no hay dataset externo. Show: matriz cliente vs benchmark. Frame: posicionamiento. Own: benchmark es orientativo. Result: ventaja en retención. More: profundizar expansion revenue.","score":84,"improvements":["NRR por encima del mid-market típico","ARR growth alineado a premium"],"visualData":["NRR 112% vs rango 105–115%","Logo velocity vs peers"]}',
      },
      input,
      0.1,
    );
  }
}

export function getComparatorBenchmarkAgent(): ComparatorBenchmarkAgent {
  return ComparatorBenchmarkAgent.instance;
}

export function resetComparatorBenchmarkAgentForTests(): void {
  ComparatorBenchmarkAgent.reset();
}
