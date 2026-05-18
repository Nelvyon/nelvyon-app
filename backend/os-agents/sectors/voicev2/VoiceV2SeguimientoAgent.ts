import type { ILlmClient } from "../../LlmClient";
import type { VoiceV2Input, VoiceV2Output } from "./shared";
import { getDefaultVoiceV2Llm, runVoiceV2AgentCore } from "./shared";

const AGENT_ID = "voicev2-seguimiento";

let inst: VoiceV2SeguimientoAgent | null = null;

export class VoiceV2SeguimientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV2SeguimientoAgent {
    if (!inst) inst = new VoiceV2SeguimientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV2Llm();
  }

  async run(input: VoiceV2Input): Promise<VoiceV2Output> {
    const eliteRole = "Eres **Voice v2 Seguimiento** — compromisos operativos.";
    const mission =
      "Planifica **seguimiento automático de acuerdos y compromisos** (SLA, recordatorios, escalado, cierre de loop).";
    const fewShot =
      '{"result":"Estados compromiso + jobs","score":85,"recommendations":["Due dates desde NLU","Reintento backoff","Owner humano opcional"]}';
    return runVoiceV2AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV2SeguimientoAgent(): VoiceV2SeguimientoAgent {
  return VoiceV2SeguimientoAgent.instance();
}

export function resetVoiceV2SeguimientoAgentForTests(): void {
  inst = null;
}
