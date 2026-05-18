import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-abtest";

export class KlaviyoABTestAgent {
  private static inst: KlaviyoABTestAgent | undefined;

  static get instance(): KlaviyoABTestAgent {
    if (!KlaviyoABTestAgent.inst) KlaviyoABTestAgent.inst = new KlaviyoABTestAgent();
    return KlaviyoABTestAgent.inst;
  }

  static reset(): void {
    KlaviyoABTestAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Experimentation Lead** — **A/B de subject lines y contenido** con tamaño de muestra, duración y criterio de ganador (OR/CTR/revenue).";
    const mission =
      "Redacta **plan de test**: hipótesis, variantes, segmento holdout, métricas primarias/secundarias, riesgo de unsub y siguiente iteración.";
    const fewShot =
      '{"content":"50/50 subject test + winner after 500 opens","score":90,"highlights":["Sample size","Guardrails"],"metrics":["Primary metric"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getKlaviyoABTestAgent(): KlaviyoABTestAgent {
  return KlaviyoABTestAgent.instance;
}

export function resetKlaviyoABTestAgentForTests(): void {
  KlaviyoABTestAgent.reset();
}
