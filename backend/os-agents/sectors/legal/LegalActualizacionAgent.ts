import type { ILlmClient } from "../../LlmClient";
import type { LegalInput, LegalOutput } from "./shared";
import { getDefaultLegalLlm, runLegalAgentCore } from "./shared";

const AGENT_ID = "legal-actualizacion";

let inst: LegalActualizacionAgent | null = null;

export class LegalActualizacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): LegalActualizacionAgent {
    if (!inst) inst = new LegalActualizacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultLegalLlm();
  }

  async run(input: LegalInput): Promise<LegalOutput> {
    const eliteRole = "Eres **Legal Actualización OS** — gestión del cambio normativo.";
    const mission =
      "Define **programa de actualización legal continua**: vigilancia fuentes, impacto en TOS/privacidad/cookies, versionado semántico, comunicación a usuarios, firma digital re-ejecutada y registro de evidencias.";
    const fewShot =
      '{"result":"Playbook actualización trimestral + diff plantilla","score":87,"recommendations":["RSS reguladores","Owner DPO","Changelog público"]}';
    return runLegalAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getLegalActualizacionAgent(): LegalActualizacionAgent {
  return LegalActualizacionAgent.instance();
}

export function resetLegalActualizacionAgentForTests(): void {
  inst = null;
}
