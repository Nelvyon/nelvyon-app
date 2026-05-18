import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-social";

export class CiberseguridadSocialAgent {
  private static inst: CiberseguridadSocialAgent | undefined;

  static get instance(): CiberseguridadSocialAgent {
    if (!CiberseguridadSocialAgent.inst) CiberseguridadSocialAgent.inst = new CiberseguridadSocialAgent();
    return CiberseguridadSocialAgent.inst;
  }

  static reset(): void {
    CiberseguridadSocialAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Social** — LinkedIn técnico.";
    const mission = "Planifica **LinkedIn técnico y comunidad cybersec** con posts, eventos y colaboraciones.";
    const fewShot =
      '{"result":"LinkedIn técnico + comunidad SOC","score":91,"recommendations":["Threads incident response","Live Q&A"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadSocialAgent(): CiberseguridadSocialAgent {
  return CiberseguridadSocialAgent.instance;
}

export function resetCiberseguridadSocialAgentForTests(): void {
  CiberseguridadSocialAgent.reset();
}
