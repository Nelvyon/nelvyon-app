import type { ILlmClient } from "../../LlmClient";
import type { IaPredictivaInput, IaPredictivaOutput } from "./shared";
import { getDefaultIaPredictivaLlm, runIaPredictivaAgentCore } from "./shared";

const AGENT_ID = "iapredictiva-segmentacion";

let inst: IaPredictivaSegmentacionAgent | null = null;

export class IaPredictivaSegmentacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): IaPredictivaSegmentacionAgent {
    if (!inst) inst = new IaPredictivaSegmentacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultIaPredictivaLlm();
  }

  async run(input: IaPredictivaInput): Promise<IaPredictivaOutput> {
    const eliteRole = "Eres **IaPredictiva Segmentación** — audiencias futuras.";
    const mission =
      "Diseña **segmentación predictiva** (features comportamiento, propensión, privacidad, uso campañas).";
    const fewShot =
      '{"result":"Matriz segmentos next-best-action","score":89,"recommendations":["Opt-in claro","No proxies sensibles","TTL segmentos"]}';
    return runIaPredictivaAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getIaPredictivaSegmentacionAgent(): IaPredictivaSegmentacionAgent {
  return IaPredictivaSegmentacionAgent.instance();
}

export function resetIaPredictivaSegmentacionAgentForTests(): void {
  inst = null;
}
