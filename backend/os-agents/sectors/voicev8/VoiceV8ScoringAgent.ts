import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-scoring";

let inst: VoiceV8ScoringAgent | null = null;

export class VoiceV8ScoringAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8ScoringAgent {
    if (!inst) inst = new VoiceV8ScoringAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Scoring** — 0-100 explicable.";
    const mission =
      "Define **scoring de agente IA 0-100** con subdimensiones ponderadas y trazabilidad a señales objetivas.";
    const fewShot =
      '{"result":"Rúbrica voz IA v1","score":90,"recommendations":["Pesos por vertical","Explain snippet","Anti-gaming"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8ScoringAgent(): VoiceV8ScoringAgent {
  return VoiceV8ScoringAgent.instance();
}

export function resetVoiceV8ScoringAgentForTests(): void {
  inst = null;
}
