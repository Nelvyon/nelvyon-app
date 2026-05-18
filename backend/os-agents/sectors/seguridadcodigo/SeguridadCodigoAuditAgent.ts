import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-audit";

let inst: SeguridadCodigoAuditAgent | null = null;

export class SeguridadCodigoAuditAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoAuditAgent {
    if (!inst) inst = new SeguridadCodigoAuditAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Auditoría** — código y dependencias.";
    const mission =
      "Planifica **auditoría de seguridad del código** y **dependencias** (SAST/DAST ligero, SBOM, políticas de versiones y CVEs).";
    const fewShot =
      '{"result":"Programa audit + SBOM","score":91,"recommendations":["npm audit CI","Pin semver","Renovate con auto-merge seguro"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoAuditAgent(): SeguridadCodigoAuditAgent {
  return SeguridadCodigoAuditAgent.instance();
}

export function resetSeguridadCodigoAuditAgentForTests(): void {
  inst = null;
}
