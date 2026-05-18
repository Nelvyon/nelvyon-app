import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-promotional-notif";

export class PushPromotionalNotifAgent {
  private static inst: PushPromotionalNotifAgent | undefined;

  static get instance(): PushPromotionalNotifAgent {
    if (!PushPromotionalNotifAgent.inst) PushPromotionalNotifAgent.inst = new PushPromotionalNotifAgent();
    return PushPromotionalNotifAgent.inst;
  }

  static reset(): void {
    PushPromotionalNotifAgent.inst = undefined;
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
          "ROLE: Growth copy top 1%; promo push con urgencia honesta y compliance.",
        mission:
          "Redacta notificaciones promocionales de alta conversión: oferta, escasez real si aplica, CTA y deep link a la oferta.",
        fewShotExample:
          '{"content":"Need conversión campaña; Opportunity fin de stock real; Target segmento high-intent; Instant ventana 48h; Focus beneficio + precio; Yield checkout.","score":88,"notifications":["Flash 48h: −20% en Premium — solo hasta domingo. Abrir oferta","Tu carrito tiene envío gratis hoy. Cierra pedido en 1 tap."],"deepLinks":["shop://promo/flash20","shop://cart?utm=push"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushPromotionalNotifAgent(): PushPromotionalNotifAgent {
  return PushPromotionalNotifAgent.instance;
}

export function resetPushPromotionalNotifAgentForTests(): void {
  PushPromotionalNotifAgent.reset();
}
