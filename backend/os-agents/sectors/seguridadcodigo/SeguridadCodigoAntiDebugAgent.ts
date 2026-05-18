import type { ILlmClient } from "../../LlmClient";
import type { SeguridadCodigoInput, SeguridadCodigoOutput } from "./shared";
import { getDefaultSeguridadCodigoLlm, runSeguridadCodigoAgentCore } from "./shared";

const AGENT_ID = "seguridadcodigo-antidebug";

let inst: SeguridadCodigoAntiDebugAgent | null = null;

export class SeguridadCodigoAntiDebugAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): SeguridadCodigoAntiDebugAgent {
    if (!inst) inst = new SeguridadCodigoAntiDebugAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSeguridadCodigoLlm();
  }

  async run(input: SeguridadCodigoInput): Promise<SeguridadCodigoOutput> {
    const eliteRole = "Eres **Seguridad Código Anti-Debug** — runtime y integridad.";
    const mission =
      "Define **anti-debugging** y **anti-tampering** en runtime (detección DevTools, integridad de bundle, respuesta degradada controlada).";
    const fewShot =
      '{"result":"Checklist anti-debug runtime","score":86,"recommendations":["Checksums runtime","Jitter en checks","No exponer mensajes de bloqueo detallados"]}';
    return runSeguridadCodigoAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getSeguridadCodigoAntiDebugAgent(): SeguridadCodigoAntiDebugAgent {
  return SeguridadCodigoAntiDebugAgent.instance();
}

export function resetSeguridadCodigoAntiDebugAgentForTests(): void {
  inst = null;
}
