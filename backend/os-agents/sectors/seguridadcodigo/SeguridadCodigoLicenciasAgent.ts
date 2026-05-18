import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-licencias";

let inst: SeguridadCodigoLicenciasAgent | null = null;

export class SeguridadCodigoLicenciasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoLicenciasAgent {
    if (!inst) inst = new SeguridadCodigoLicenciasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Licencias** — activación y cumplimiento.";
    const mission =
      "Diseña **sistema de licencias**, **activación** offline/online y controles anti-clonado sin fricción excesiva para usuarios legítimos.";
    const fewShot =
      '{"result":"Modelo licencias por dispositivo","score":84,"recommendations":["JWT firmado corto","Revocación central","Grace period"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoLicenciasAgent(): SeguridadCodigoLicenciasAgent {
  return SeguridadCodigoLicenciasAgent.instance();
}

export function resetSeguridadCodigoLicenciasAgentForTests(): void {
  inst = null;
}
