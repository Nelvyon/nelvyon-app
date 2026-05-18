import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-social";

export class TelecomSocialAgent {
  private static inst: TelecomSocialAgent | undefined;

  static get instance(): TelecomSocialAgent {
    if (!TelecomSocialAgent.inst) TelecomSocialAgent.inst = new TelecomSocialAgent();
    return TelecomSocialAgent.inst;
  }

  static reset(): void {
    TelecomSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Social** — comunidad.";
    const mission = "Planifica **social media y gestión de comunidad** con soporte, campañas y crisis light.";
    const fewShot =
      '{"result":"Social + comunidad operadora","score":91,"recommendations":["Horario soporte social","UGC velocidad"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomSocialAgent(): TelecomSocialAgent {
  return TelecomSocialAgent.instance;
}

export function resetTelecomSocialAgentForTests(): void {
  TelecomSocialAgent.reset();
}
