import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-marcas";

let inst: ProteccionIpMarcasAgent | null = null;

export class ProteccionIpMarcasAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpMarcasAgent {
    if (!inst) inst = new ProteccionIpMarcasAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Marcas** — registro y vigilancia.";
    const mission =
      "Diseña **registro de marcas** y **monitoreo de infracción** global (clases Niza, watch services, oposiciones).";
    const fewShot =
      '{"result":"Hoja ruta registro EU + USPTO","score":93,"recommendations":["Watch keyword","Política uso logo"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpMarcasAgent(): ProteccionIpMarcasAgent {
  return ProteccionIpMarcasAgent.instance();
}

export function resetProteccionIpMarcasAgentForTests(): void {
  inst = null;
}
