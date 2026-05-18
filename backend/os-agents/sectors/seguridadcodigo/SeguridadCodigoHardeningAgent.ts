import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-hardening";

let inst: SeguridadCodigoHardeningAgent | null = null;

export class SeguridadCodigoHardeningAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoHardeningAgent {
    if (!inst) inst = new SeguridadCodigoHardeningAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Hardening** — backend y configuración.";
    const mission =
      "Detalla **hardening de backend** y **configuración segura** (secretos, IAM, headers, TLS, hardening de contenedores/VM).";
    const fewShot =
      '{"result":"Baseline hardening servidor","score":89,"recommendations":["CSP estricto","No root en Docker","Secrets manager"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoHardeningAgent(): SeguridadCodigoHardeningAgent {
  return SeguridadCodigoHardeningAgent.instance();
}

export function resetSeguridadCodigoHardeningAgentForTests(): void {
  inst = null;
}
