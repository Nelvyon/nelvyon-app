import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-resumen";

let inst: VoiceV2ResumenAgent | null = null;

export class VoiceV2ResumenAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2ResumenAgent {
    if (!inst) inst = new VoiceV2ResumenAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Resumen** — cierre estructurado.";
    const mission =
      "Define **resumen automático post-llamada** (motivo, decisión, próximos pasos, riesgos, handoff humano).";
    const fewShot =
      '{"result":"Plantilla resumen JSON→CRM","score":89,"recommendations":["Bullets máx 5","Citación de hechos vs inferencias","Webhook idempotente"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2ResumenAgent(): VoiceV2ResumenAgent {
  return VoiceV2ResumenAgent.instance();
}

export function resetVoiceV2ResumenAgentForTests(): void {
  inst = null;
}
