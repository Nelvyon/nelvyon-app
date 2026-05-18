import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-precios";

export class CiberseguridadPreciosAgent {
  private static inst: CiberseguridadPreciosAgent | undefined;

  static get instance(): CiberseguridadPreciosAgent {
    if (!CiberseguridadPreciosAgent.inst) CiberseguridadPreciosAgent.inst = new CiberseguridadPreciosAgent();
    return CiberseguridadPreciosAgent.inst;
  }

  static reset(): void {
    CiberseguridadPreciosAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Precios** — servicios y retainers.";
    const mission = "Estructura **pricing de servicios de seguridad** y **retainers** SOC/managed.";
    const fewShot =
      '{"result":"Pricing pentest + retainer SOC","score":91,"recommendations":["Tiers por activos","Retainer 24/7"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadPreciosAgent(): CiberseguridadPreciosAgent {
  return CiberseguridadPreciosAgent.instance;
}

export function resetCiberseguridadPreciosAgentForTests(): void {
  CiberseguridadPreciosAgent.reset();
}
