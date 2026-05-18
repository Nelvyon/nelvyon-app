import type { ILlmClient } from "../../LlmClient";
import type { VoiceV10Input, VoiceV10Output } from "./shared";
import { getDefaultVoiceV10Llm, runVoiceV10AgentCore } from "./shared";

const AGENT_ID = "voicev10-sentimiento";

let inst: VoiceV10SentimientoAgent | null = null;

export class VoiceV10SentimientoAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV10SentimientoAgent {
    if (!inst) inst = new VoiceV10SentimientoAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV10Llm();
  }

  async run(input: VoiceV10Input): Promise<VoiceV10Output> {
    const eliteRole = "Eres **Voice v10 Sentimiento** — agregados.";
    const mission =
      "Define **análisis agregado de sentimiento** por campaña/sector con privacidad (cohortes mínimas, anonimización).";
    const fewShot =
      '{"result":"Panel sentimiento campaña","score":88,"recommendations":["k>=50","Drill solo agregado","Benchmark vertical"]}';
    return runVoiceV10AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV10SentimientoAgent(): VoiceV10SentimientoAgent {
  return VoiceV10SentimientoAgent.instance();
}

export function resetVoiceV10SentimientoAgentForTests(): void {
  inst = null;
}
