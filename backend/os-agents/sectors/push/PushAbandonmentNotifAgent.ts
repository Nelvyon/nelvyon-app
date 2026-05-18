import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-abandonment-notif";

export class PushAbandonmentNotifAgent {
  private static inst: PushAbandonmentNotifAgent | undefined;

  static get instance(): PushAbandonmentNotifAgent {
    if (!PushAbandonmentNotifAgent.inst) PushAbandonmentNotifAgent.inst = new PushAbandonmentNotifAgent();
    return PushAbandonmentNotifAgent.inst;
  }

  static reset(): void {
    PushAbandonmentNotifAgent.inst = undefined;
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
          "ROLE: Lifecycle recovery top 1%; secuencias anti-abandono sin acosar.",
        mission:
          "Genera secuencia de notificaciones para recuperar abandonos (carrito, formulario, trial): 3–4 pings con timing y copy distinto por paso.",
        fewShotExample:
          '{"content":"Secuencia NOTIFY: T1 1h beneficio; T2 24h prueba social; T3 72h incentivo suave; T4 último aviso respetuoso.","score":85,"notifications":["T1: Tu carrito te espera — envío gratis si cierras hoy","T2: 2.000 personas compraron este mes este pack","T3: Te guardamos un 10% extra 24h","T4: ¿Necesitas ayuda con el pago?"],"deepLinks":["app://cart/recover","app://help/checkout"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushAbandonmentNotifAgent(): PushAbandonmentNotifAgent {
  return PushAbandonmentNotifAgent.instance;
}

export function resetPushAbandonmentNotifAgentForTests(): void {
  PushAbandonmentNotifAgent.reset();
}
