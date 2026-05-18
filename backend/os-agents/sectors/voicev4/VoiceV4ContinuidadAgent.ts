import type { ILlmClient } from "../../LlmClient";
import type { VoiceV4Input, VoiceV4Output } from "./shared";
import { getDefaultVoiceV4Llm, runVoiceV4AgentCore } from "./shared";

const AGENT_ID = "voicev4-continuidad";

let inst: VoiceV4ContinuidadAgent | null = null;

export class VoiceV4ContinuidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV4ContinuidadAgent {
    if (!inst) inst = new VoiceV4ContinuidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV4Llm();
  }

  async run(input: VoiceV4Input): Promise<VoiceV4Output> {
    const eliteRole = "Eres **Voice v4 Continuidad** — estado unificado.";
    const mission =
      "Diseña **continuidad de contexto entre canales sin pérdida** (event sourcing ligero, merges, resolución de conflictos).";
    const fewShot =
      '{"result":"Modelo estado omnicanal","score":87,"recommendations":["Vector clock ligero","Snapshot al saltar","Rehidratar último intent"]}';
    return runVoiceV4AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV4ContinuidadAgent(): VoiceV4ContinuidadAgent {
  return VoiceV4ContinuidadAgent.instance();
}

export function resetVoiceV4ContinuidadAgentForTests(): void {
  inst = null;
}
