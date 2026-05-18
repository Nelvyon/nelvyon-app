import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-roi-calculator";

export class ComparatorROICalculatorAgent {
  private static inst: ComparatorROICalculatorAgent | undefined;

  static get instance(): ComparatorROICalculatorAgent {
    if (!ComparatorROICalculatorAgent.inst) ComparatorROICalculatorAgent.inst = new ComparatorROICalculatorAgent();
    return ComparatorROICalculatorAgent.inst;
  }

  static reset(): void {
    ComparatorROICalculatorAgent.inst = undefined;
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
          "ROLE: Finanzas aplicadas top 1%; ROI honesto con supuestos explícitos cuando falten datos.",
        mission:
          "Calcula y presenta el ROI real del período: ingreso incremental vs inversión implícita en el brief; sensibilidad breve.",
        fewShotExample:
          '{"content":"Then: spend 12k, revenue 38k. Results: revenue 62k en período comparable. Achieved: +24k incremental bruto. Numbers: ROI neto documentado con hipótesis de margen 40%. Show: tabla spend→return. Frame: retorno sobre gasto atribuible. Own: margen es supuesto si no viene en datos. Result: ROI positivo en escenario base. More: validar margen con finance.","score":88,"improvements":["Revenue +63% vs baseline","ROI positivo en escenario base"],"visualData":["Spend 12k → retorno incremental +24k","Margen asumido 40%"]}',
      },
      input,
      0.1,
    );
  }
}

export function getComparatorROICalculatorAgent(): ComparatorROICalculatorAgent {
  return ComparatorROICalculatorAgent.instance;
}

export function resetComparatorROICalculatorAgentForTests(): void {
  ComparatorROICalculatorAgent.reset();
}
