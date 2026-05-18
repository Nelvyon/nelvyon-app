import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-welcome-notif";

export class PushWelcomeNotifAgent {
  private static inst: PushWelcomeNotifAgent | undefined;

  static get instance(): PushWelcomeNotifAgent {
    if (!PushWelcomeNotifAgent.inst) PushWelcomeNotifAgent.inst = new PushWelcomeNotifAgent();
    return PushWelcomeNotifAgent.inst;
  }

  static reset(): void {
    PushWelcomeNotifAgent.inst = undefined;
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
          "ROLE: Push copywriter top 1%; bienvenidas que activan primer valor sin saturar en D0.",
        mission:
          "Genera notificación de bienvenida personalizada por sector y marca: tono, beneficio claro y CTA al núcleo del producto.",
        fewShotExample:
          '{"content":"NOTIFY aplicado: Need primer uso; Opportunity post-registro 15min; Target nuevo usuario iOS; Instant 1 ping D0; Focus una promesa; Yield open app tutorial.","score":90,"notifications":["¡Hola en Acme Fit! Tu plan empieza hoy — abre y activa tu rutina (≤120 chars)","Variant B: Tu zona de entreno ya está lista. Toca para el primer workout."],"deepLinks":["acmefit://onboarding/start","acmefit://home?src=welcome"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushWelcomeNotifAgent(): PushWelcomeNotifAgent {
  return PushWelcomeNotifAgent.instance;
}

export function resetPushWelcomeNotifAgentForTests(): void {
  PushWelcomeNotifAgent.reset();
}
