import type { ILlmClient } from "../../LlmClient";
import type { KlaviyoInput, KlaviyoOutput } from "./shared";
import { getDefaultKlaviyoLlm, runKlaviyoAgentCore } from "./shared";

const AGENT_ID = "klaviyo-segment";

export class KlaviyoSegmentAgent {
  private static inst: KlaviyoSegmentAgent | undefined;

  static get instance(): KlaviyoSegmentAgent {
    if (!KlaviyoSegmentAgent.inst) KlaviyoSegmentAgent.inst = new KlaviyoSegmentAgent();
    return KlaviyoSegmentAgent.inst;
  }

  static reset(): void {
    KlaviyoSegmentAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKlaviyoLlm();
  }

  async run(input: KlaviyoInput): Promise<KlaviyoOutput> {
    const eliteRole =
      "Eres **Klaviyo Segment Builder** — segmentos dinámicos sincronizados desde **datos NELVYON** (perfiles, eventos, compras).";
    const mission =
      "Define **segmentos**: **VIP (>3 compras)**, **en riesgo (sin abrir 30 días)**, **nuevos (<7 días)**; reglas Klaviyo + fuentes de sync; exclusiones y solapes.";
    const fewShot =
      '{"content":"VIP dynamic list + at-risk no-open 30d","score":92,"highlights":[">3 orders","30d no open"],"metrics":["Segment refresh"]}';
    return runKlaviyoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getKlaviyoSegmentAgent(): KlaviyoSegmentAgent {
  return KlaviyoSegmentAgent.instance;
}

export function resetKlaviyoSegmentAgentForTests(): void {
  KlaviyoSegmentAgent.reset();
}
