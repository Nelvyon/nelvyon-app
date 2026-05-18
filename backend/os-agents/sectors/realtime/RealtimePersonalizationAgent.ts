import type { ILlmClient } from "../../LlmClient";
import type { RealtimeInput, RealtimeOutput } from "./shared";
import { getDefaultRealtimeLlm, runRealtimeAgentCore } from "./shared";

const AGENT_ID = "realtime-personalization";

export class RealtimePersonalizationAgent {
  private static inst: RealtimePersonalizationAgent | undefined;

  static get instance(): RealtimePersonalizationAgent {
    if (!RealtimePersonalizationAgent.inst) RealtimePersonalizationAgent.inst = new RealtimePersonalizationAgent();
    return RealtimePersonalizationAgent.inst;
  }

  static reset(): void {
    RealtimePersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultRealtimeLlm();
  }

  async run(input: RealtimeInput): Promise<RealtimeOutput> {
    const eliteRole =
      "Eres **Realtime Offer Personalizer** — contenido y ofertas 1:1 en sesión.";
    const mission =
      "Personaliza **contenido/ofertas en tiempo real**: si **>2 min sin convertir** → **oferta personalizada** automática por usuario.";
    const fewShot =
      '{"content":">2min no convert → personalized offer","score":88,"highlights":["2min rule","Live offer"],"metrics":["Personalization lift"]}';
    return runRealtimeAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getRealtimePersonalizationAgent(): RealtimePersonalizationAgent {
  return RealtimePersonalizationAgent.instance;
}

export function resetRealtimePersonalizationAgentForTests(): void {
  RealtimePersonalizationAgent.reset();
}
