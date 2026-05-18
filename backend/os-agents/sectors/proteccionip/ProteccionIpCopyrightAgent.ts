import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-copyright";

let inst: ProteccionIpCopyrightAgent | null = null;

export class ProteccionIpCopyrightAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpCopyrightAgent {
    if (!inst) inst = new ProteccionIpCopyrightAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Copyright** — código y contenido.";
    const mission =
      "Diseña **derechos de autor** sobre **código** y **contenido** (licencias, depósito, cadena de titularidad).";
    const fewShot =
      '{"result":"Política headers LICENSE + NOTICE","score":91,"recommendations":["CLA contribuidores","Registro obra clave"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpCopyrightAgent(): ProteccionIpCopyrightAgent {
  return ProteccionIpCopyrightAgent.instance();
}

export function resetProteccionIpCopyrightAgentForTests(): void {
  inst = null;
}
