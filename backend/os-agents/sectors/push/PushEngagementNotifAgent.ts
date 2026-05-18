import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-engagement-notif";

export class PushEngagementNotifAgent {
  private static inst: PushEngagementNotifAgent | undefined;

  static get instance(): PushEngagementNotifAgent {
    if (!PushEngagementNotifAgent.inst) PushEngagementNotifAgent.inst = new PushEngagementNotifAgent();
    return PushEngagementNotifAgent.inst;
  }

  static reset(): void {
    PushEngagementNotifAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPushLlm();
  }

  async run(input: PushInput): Promise<PushOutput> {
    return runPushAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Reactivation PM top 1%; push que devuelve usuarios sin culpa ni ruído.",
        mission:
          "Crea notificaciones de reengagement para usuarios inactivos según triggerEvent y segmento: cadencia sugerida y mensajes escaneables.",
        fewShotExample:
          '{"content":"Need volver al hábito; Opportunity ventana tarde; Target silencio 7d; Instant D7 uno solo; Focus beneficio guardado; Yield sesión corta.","score":87,"notifications":["Te extrañamos en Studio X — retoma donde lo dejaste (2 min)","Tu lista sigue aquí. Un tap y sigues."],"deepLinks":["studiox://resume?segment=dormant","studiox://inbox"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushEngagementNotifAgent(): PushEngagementNotifAgent {
  return PushEngagementNotifAgent.instance;
}

export function resetPushEngagementNotifAgentForTests(): void {
  PushEngagementNotifAgent.reset();
}
