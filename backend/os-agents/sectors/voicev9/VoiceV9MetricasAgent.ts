import type { ILlmClient } from "../../LlmClient";
import type { VoiceV9Input, VoiceV9Output } from "./shared";
import { getDefaultVoiceV9Llm, runVoiceV9AgentCore } from "./shared";

const AGENT_ID = "voicev9-metricas";

let inst: VoiceV9MetricasAgent | null = null;

export class VoiceV9MetricasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV9MetricasAgent {
    if (!inst) inst = new VoiceV9MetricasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV9Llm();
  }

  async run(input: VoiceV9Input): Promise<VoiceV9Output> {
    const eliteRole = "Eres **Voice v9 Métricas** — entrega y apertura.";
    const mission =
      "Diseña **métricas de entrega y apertura** por canal (DLR SMS, read receipts WA, join rate vídeo) con privacidad.";
    const fewShot =
      '{"result":"Tablero omnicanal KPI","score":88,"recommendations":["Agregación campaña","Sin MSISDN en raw","Funnel voz→WA"]}';
    return runVoiceV9AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV9MetricasAgent(): VoiceV9MetricasAgent {
  return VoiceV9MetricasAgent.instance();
}

export function resetVoiceV9MetricasAgentForTests(): void {
  inst = null;
}
