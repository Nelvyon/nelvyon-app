import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-patentes";

let inst: ProteccionIpPatentesAgent | null = null;

export class ProteccionIpPatentesAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpPatentesAgent {
    if (!inst) inst = new ProteccionIpPatentesAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Patentes** — software e inventos.";
    const mission =
      "Diseña **estrategia de patentes de software** y protección de **inventos** (prior art, divisionales, trade-off secreto).";
    const fewShot =
      '{"result":"Mapa claims vs publicación código","score":92,"recommendations":["Documentar inventorship","Fase PCT"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpPatentesAgent(): ProteccionIpPatentesAgent {
  return ProteccionIpPatentesAgent.instance();
}

export function resetProteccionIpPatentesAgentForTests(): void {
  inst = null;
}
