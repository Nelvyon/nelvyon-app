import type { ILlmClient } from "../../LlmClient";
import type { TelecomunicacionesInput, TelecomunicacionesOutput } from "./shared";
import { getDefaultTelecomunicacionesLlm, runTelecomunicacionesAgentCore } from "./shared";

const AGENT_ID = "telecomunicaciones-adquisicion";

export class TelecomAdquisicionAgent {
  private static inst: TelecomAdquisicionAgent | undefined;

  static get instance(): TelecomAdquisicionAgent {
    if (!TelecomAdquisicionAgent.inst) TelecomAdquisicionAgent.inst = new TelecomAdquisicionAgent();
    return TelecomAdquisicionAgent.inst;
  }

  static reset(): void {
    TelecomAdquisicionAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultTelecomunicacionesLlm();
  }

  async run(input: TelecomunicacionesInput): Promise<TelecomunicacionesOutput> {
    const eliteRole = "Eres **Telecom Adquisición** — residencial y empresa.";
    const mission = "Diseña **captación de clientes residencial y empresa** con bundles fibra/móvil y B2B.";
    const fewShot =
      '{"result":"Adquisición residencial + PYME ISP","score":93,"recommendations":["Bundle fibra+móvil","SD-WAN lead"]}';
    return runTelecomunicacionesAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getTelecomAdquisicionAgent(): TelecomAdquisicionAgent {
  return TelecomAdquisicionAgent.instance;
}

export function resetTelecomAdquisicionAgentForTests(): void {
  TelecomAdquisicionAgent.reset();
}
