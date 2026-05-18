import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-metrics-narrator";

export class ComparatorMetricsNarratorAgent {
  private static inst: ComparatorMetricsNarratorAgent | undefined;

  static get instance(): ComparatorMetricsNarratorAgent {
    if (!ComparatorMetricsNarratorAgent.inst) ComparatorMetricsNarratorAgent.inst = new ComparatorMetricsNarratorAgent();
    return ComparatorMetricsNarratorAgent.inst;
  }

  static reset(): void {
    ComparatorMetricsNarratorAgent.inst = undefined;
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
          "ROLE: Narrador ejecutivo top 1%; traduce deltas de métricas en historia de negocio clara y creíble.",
        mission:
          "Narra en lenguaje de dirección la mejora antes/después: causas probables, magnitud del salto y lectura para el board.",
        fewShotExample:
          '{"content":"Then: CAC 120€. Results: CAC 84€ (−30%). Achieved: canal orgánico +30%. Numbers: mix exacto del brief. Show: una línea por KPI. Frame: eficiencia de adquisición. Own: sin extrapolar fuera del período. Result: runway comercial más largo. More: escalar lo que funcionó.","score":91,"improvements":["CAC −30%","Mix orgánico +30%"],"visualData":["CAC 120→84€","Payback −18 días"]}',
      },
      input,
      0.5,
    );
  }
}

export function getComparatorMetricsNarratorAgent(): ComparatorMetricsNarratorAgent {
  return ComparatorMetricsNarratorAgent.instance;
}

export function resetComparatorMetricsNarratorAgentForTests(): void {
  ComparatorMetricsNarratorAgent.reset();
}
