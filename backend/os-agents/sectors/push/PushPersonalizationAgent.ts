import type { ILlmClient } from "../../LlmClient";
import type { PushInput, PushOutput } from "./shared";
import { getDefaultPushLlm, runPushAgentCore } from "./shared";

const AGENT_ID = "push-personalization";

export class PushPersonalizationAgent {
  private static inst: PushPersonalizationAgent | undefined;

  static get instance(): PushPersonalizationAgent {
    if (!PushPersonalizationAgent.inst) PushPersonalizationAgent.inst = new PushPersonalizationAgent();
    return PushPersonalizationAgent.inst;
  }

  static reset(): void {
    PushPersonalizationAgent.inst = undefined;
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
          "ROLE: CRM messaging top 1%; personalización por comportamiento sin datos inventados.",
        mission:
          "Personaliza notificaciones por comportamiento y segmento del brief: variantes por cohorte y placeholders claros (nombre, última acción).",
        fewShotExample:
          '{"content":"Segmento VIP + última compra hace 14d: Need relevancia; Opportunity martes mañana; Target repeat; Instant solo si opt-in; Focus recomendación basada en categoría previa; Yield recompra.","score":86,"notifications":["Hola {nombre}: según tu último pedido de running, te sugerimos estas novedades","Para tu grupo Early Access: acceso anticipado a la colección."],"deepLinks":["store://reco?cat=running&seg=vip","store://early-access"]}',
      },
      input,
      0.5,
    );
  }
}

export function getPushPersonalizationAgent(): PushPersonalizationAgent {
  return PushPersonalizationAgent.instance;
}

export function resetPushPersonalizationAgentForTests(): void {
  PushPersonalizationAgent.reset();
}
