import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-email";

export class CiberseguridadEmailAgent {
  private static inst: CiberseguridadEmailAgent | undefined;

  static get instance(): CiberseguridadEmailAgent {
    if (!CiberseguridadEmailAgent.inst) CiberseguridadEmailAgent.inst = new CiberseguridadEmailAgent();
    return CiberseguridadEmailAgent.inst;
  }

  static reset(): void {
    CiberseguridadEmailAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Email** — nurturing enterprise.";
    const mission = "Diseña **email nurturing para leads enterprise** con secuencias por rol y compliance.";
    const fewShot =
      '{"result":"Email nurturing enterprise SOC vendor","score":90,"recommendations":["Secuencia CISO","POC invite"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadEmailAgent(): CiberseguridadEmailAgent {
  return CiberseguridadEmailAgent.instance;
}

export function resetCiberseguridadEmailAgentForTests(): void {
  CiberseguridadEmailAgent.reset();
}
