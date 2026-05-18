import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-transactional-notif";

export class PushTransactionalNotifAgent {
  private static inst: PushTransactionalNotifAgent | undefined;

  static get instance(): PushTransactionalNotifAgent {
    if (!PushTransactionalNotifAgent.inst) PushTransactionalNotifAgent.inst = new PushTransactionalNotifAgent();
    return PushTransactionalNotifAgent.inst;
  }

  static reset(): void {
    PushTransactionalNotifAgent.inst = undefined;
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
          "ROLE: Fintech/commerce ops copy top 1%; transaccionales claros, sin marketing encubierto.",
        mission:
          "Genera notificaciones transaccionales (confirmaciones, alertas, envíos) alineadas al triggerEvent: datos mínimos y acción útil.",
        fewShotExample:
          '{"content":"Need confirmación; Opportunity inmediato post-pago; Target comprador; Instant segundos; Focus estado + siguiente paso; Yield tranquilidad.","score":92,"notifications":["Pago recibido — pedido #4821 en preparación. Ver detalle","Alerta: movimiento distinto a tu patrón. Revisa en la app."],"deepLinks":["payapp://orders/4821","payapp://security/alerts?id=14"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushTransactionalNotifAgent(): PushTransactionalNotifAgent {
  return PushTransactionalNotifAgent.instance;
}

export function resetPushTransactionalNotifAgentForTests(): void {
  PushTransactionalNotifAgent.reset();
}
