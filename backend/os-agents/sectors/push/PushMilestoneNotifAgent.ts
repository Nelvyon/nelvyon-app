import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-milestone-notif";

export class PushMilestoneNotifAgent {
  private static inst: PushMilestoneNotifAgent | undefined;

  static get instance(): PushMilestoneNotifAgent {
    if (!PushMilestoneNotifAgent.inst) PushMilestoneNotifAgent.inst = new PushMilestoneNotifAgent();
    return PushMilestoneNotifAgent.inst;
  }

  static reset(): void {
    PushMilestoneNotifAgent.inst = undefined;
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
          "ROLE: Community & gamification copy top 1%; celebración sin infantilizar.",
        mission:
          "Crea notificaciones de celebración de hitos del usuario según triggerEvent: logro, racha, nivel o aniversario con deep link al perfil o feed.",
        fewShotExample:
          '{"content":"Need reconocimiento; Opportunity post-logro inmediato; Target power user; Instant minutos; Focus orgullo + siguiente meta; Yield share opcional.","score":89,"notifications":["¡100 días seguidos! Tu constancia merece brillar — ver insignia","Nivel Pro desbloqueado. Descubre nuevas ventajas en la app."],"deepLinks":["habitapp://profile/badges","habitapp://rewards/pro"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushMilestoneNotifAgent(): PushMilestoneNotifAgent {
  return PushMilestoneNotifAgent.instance;
}

export function resetPushMilestoneNotifAgentForTests(): void {
  PushMilestoneNotifAgent.reset();
}
