import type { ILlmClient } from "../../LlmClient";
import type { ComparatorInput, ComparatorOutput } from "./shared";
import { getDefaultComparatorLlm, runComparatorAgentCore } from "./shared";

const AGENT_ID = "comparator-upsell-trigger";

export class ComparatorUpsellTriggerAgent {
  private static inst: ComparatorUpsellTriggerAgent | undefined;

  static get instance(): ComparatorUpsellTriggerAgent {
    if (!ComparatorUpsellTriggerAgent.inst) ComparatorUpsellTriggerAgent.inst = new ComparatorUpsellTriggerAgent();
    return ComparatorUpsellTriggerAgent.inst;
  }

  static reset(): void {
    ComparatorUpsellTriggerAgent.inst = undefined;
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
          "ROLE: Expansion AE top 1%; detecta triggers de upgrade basados en éxito demostrado.",
        mission:
          "Detecta mejoras logradas y genera propuesta de upgrade con pilares, valor esperado y siguiente paso comercial.",
        fewShotExample:
          '{"content":"Triggers: +35% velocidad pipeline (dato brief), satisfacción implícita por métricas ascendentes. Propuesta: tier Analytics+Automation. Valor: menos horas/hombre en reporting. Package: sprint 3 semanas. Own: pricing orientativo. Result: conversación madura. More: ROI calculator adjunto.","score":85,"improvements":["Trigger cuantificado en brief","Pack upgrade acotado en tiempo"],"visualData":["Pipeline cycle −35%","Offer: 3 semanas sprint"]}',
      },
      input,
      0.1,
    );
  }
}

export function getComparatorUpsellTriggerAgent(): ComparatorUpsellTriggerAgent {
  return ComparatorUpsellTriggerAgent.instance;
}

export function resetComparatorUpsellTriggerAgentForTests(): void {
  ComparatorUpsellTriggerAgent.reset();
}
