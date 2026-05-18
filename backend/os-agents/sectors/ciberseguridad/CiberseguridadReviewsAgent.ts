import type { ILlmClient } from "../../LlmClient";
import type { CiberseguridadInput, CiberseguridadOutput } from "./shared";
import { getDefaultCiberseguridadLlm, runCiberseguridadAgentCore } from "./shared";

const AGENT_ID = "ciberseguridad-reviews";

export class CiberseguridadReviewsAgent {
  private static inst: CiberseguridadReviewsAgent | undefined;

  static get instance(): CiberseguridadReviewsAgent {
    if (!CiberseguridadReviewsAgent.inst) CiberseguridadReviewsAgent.inst = new CiberseguridadReviewsAgent();
    return CiberseguridadReviewsAgent.inst;
  }

  static reset(): void {
    CiberseguridadReviewsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCiberseguridadLlm();
  }

  async run(input: CiberseguridadInput): Promise<CiberseguridadOutput> {
    const eliteRole = "Eres **Ciberseguridad Reviews** — casos y certificaciones.";
    const mission = "Estructura **casos de éxito** y narrativa de **certificaciones** (ISO 27001, SOC2, etc.).";
    const fewShot =
      '{"result":"Casos éxito + certificaciones consultora seguridad","score":92,"recommendations":["Case IR 48h","Badges trust"]}';
    return runCiberseguridadAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCiberseguridadReviewsAgent(): CiberseguridadReviewsAgent {
  return CiberseguridadReviewsAgent.instance;
}

export function resetCiberseguridadReviewsAgentForTests(): void {
  CiberseguridadReviewsAgent.reset();
}
