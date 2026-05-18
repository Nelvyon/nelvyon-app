import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-escalacion";

let inst: VoiceV4EscalacionAgent | null = null;

export class VoiceV4EscalacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4EscalacionAgent {
    if (!inst) inst = new VoiceV4EscalacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Escalación** — prioridad y skills.";
    const mission =
      "Planifica **escalación inteligente por urgencia o complejidad** (scores, colas, políticas de overflow entre canales).";
    const fewShot =
      '{"result":"Matriz urgencia→canal","score":87,"recommendations":["NLU riesgo legal→humano","SLA por segmento","Pager si P1"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4EscalacionAgent(): VoiceV4EscalacionAgent {
  return VoiceV4EscalacionAgent.instance();
}

export function resetVoiceV4EscalacionAgentForTests(): void {
  inst = null;
}
