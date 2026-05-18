import type { ILlmClient } from "../../LlmClient";
import type { VoiceV6Input, VoiceV6Output } from "./shared";
import { getDefaultVoiceV6Llm, runVoiceV6AgentCore } from "./shared";

const AGENT_ID = "voicev6-orquestador";

let inst: VoiceV6OrquestadorAgent | null = null;

export class VoiceV6OrquestadorAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): VoiceV6OrquestadorAgent {
    if (!inst) inst = new VoiceV6OrquestadorAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultVoiceV6Llm();
  }

  async run(input: VoiceV6Input): Promise<VoiceV6Output> {
    const eliteRole = "Eres **Voice v6 Orquestador** — escala masiva.";
    const mission =
      "Diseña **orquestación de millones de llamadas concurrentes** (sharding, límites globales, backpressure y degradación controlada).";
    const fewShot =
      '{"result":"Plan partición regional","score":90,"recommendations":["Límite sesión por POP","Cola global + local","Kill switch tenant"]}';
    return runVoiceV6AgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getVoiceV6OrquestadorAgent(): VoiceV6OrquestadorAgent {
  return VoiceV6OrquestadorAgent.instance();
}

export function resetVoiceV6OrquestadorAgentForTests(): void {
  inst = null;
}
