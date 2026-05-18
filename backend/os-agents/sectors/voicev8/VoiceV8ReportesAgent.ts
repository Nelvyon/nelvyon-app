import type { ILlmClient } from "../../LlmClient";
import type { VoiceV8Input, VoiceV8Output } from "./shared";
import { getDefaultVoiceV8Llm, runVoiceV8AgentCore } from "./shared";

const AGENT_ID = "voicev8-reportes";

let inst: VoiceV8ReportesAgent | null = null;

export class VoiceV8ReportesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV8ReportesAgent {
    if (!inst) inst = new VoiceV8ReportesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV8Llm();
  }

  async run(input: VoiceV8Input): Promise<VoiceV8Output> {
    const eliteRole = "Eres **Voice v8 Reportes** — cadencia semanal.";
    const mission =
      "Planifica **reportes semanales de rendimiento** (tendencias, drivers, acciones recomendadas para liderazgo).";
    const fewShot =
      '{"result":"One-pager semanal voz","score":88,"recommendations":["Sparkline 8 semanas","Top 3 causas FCR","Anexo datos"]}';
    return runVoiceV8AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV8ReportesAgent(): VoiceV8ReportesAgent {
  return VoiceV8ReportesAgent.instance();
}

export function resetVoiceV8ReportesAgentForTests(): void {
  inst = null;
}
