import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-leadgen";

export class CiberseguridadLeadGenAgent {
  private static inst: CiberseguridadLeadGenAgent | undefined;

  static get instance(): CiberseguridadLeadGenAgent {
    if (!CiberseguridadLeadGenAgent.inst) CiberseguridadLeadGenAgent.inst = new CiberseguridadLeadGenAgent();
    return CiberseguridadLeadGenAgent.inst;
  }

  static reset(): void {
    CiberseguridadLeadGenAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Lead Gen** — enterprise.";
    const mission = "Define **captación de CISOs, IT managers y empresas** con ICP, canales y ofertas de valor.";
    const fewShot =
      '{"result":"Lead gen CISO + IT managers consultora pentest","score":92,"recommendations":["Assessment gratuito","ABM vertical"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadLeadGenAgent(): CiberseguridadLeadGenAgent {
  return CiberseguridadLeadGenAgent.instance;
}

export function resetCiberseguridadLeadGenAgentForTests(): void {
  CiberseguridadLeadGenAgent.reset();
}
