import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-heatmap";

let inst: VoiceV8HeatmapAgent | null = null;

export class VoiceV8HeatmapAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8HeatmapAgent {
    if (!inst) inst = new VoiceV8HeatmapAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Heatmap** — densidad conversacional.";
    const mission =
      "Diseña **heatmaps de conversación** (actividad por minuto, solapes, barge-in, handoff) agregados y por llamada.";
    const fewShot =
      '{"result":"Especificación heatmap timeline","score":86,"recommendations":["Bins 5s","Capacidad color ciega","Export PNG+CSV"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8HeatmapAgent(): VoiceV8HeatmapAgent {
  return VoiceV8HeatmapAgent.instance();
}

export function resetVoiceV8HeatmapAgentForTests(): void {
  inst = null;
}
