import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-authority";

export class CiberseguridadAuthorityAgent {
  private static inst: CiberseguridadAuthorityAgent | undefined;

  static get instance(): CiberseguridadAuthorityAgent {
    if (!CiberseguridadAuthorityAgent.inst) CiberseguridadAuthorityAgent.inst = new CiberseguridadAuthorityAgent();
    return CiberseguridadAuthorityAgent.inst;
  }

  static reset(): void {
    CiberseguridadAuthorityAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Authority** — thought leadership.";
    const mission = "Diseña **thought leadership y posicionamiento experto** para la firma o vendor de seguridad.";
    const fewShot =
      '{"result":"Authority SOC + threat intel para enterprise","score":93,"recommendations":["Pilares técnicos","Research notes"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadAuthorityAgent(): CiberseguridadAuthorityAgent {
  return CiberseguridadAuthorityAgent.instance;
}

export function resetCiberseguridadAuthorityAgentForTests(): void {
  CiberseguridadAuthorityAgent.reset();
}
