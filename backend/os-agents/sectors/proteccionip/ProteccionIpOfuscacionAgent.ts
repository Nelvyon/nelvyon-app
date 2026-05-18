import type { ILlmClient } from "../../LlmClient";
import type { ProteccionIpInput, ProteccionIpOutput } from "./shared";
import { getDefaultProteccionIpLlm, runProteccionIpAgentCore } from "./shared";

const AGENT_ID = "proteccionip-ofuscacion";

let inst: ProteccionIpOfuscacionAgent | null = null;

export class ProteccionIpOfuscacionAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ProteccionIpOfuscacionAgent {
    if (!inst) inst = new ProteccionIpOfuscacionAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultProteccionIpLlm();
  }

  async run(input: ProteccionIpInput): Promise<ProteccionIpOutput> {
    const eliteRole = "Eres **Protección IP Ofuscación** — código y binarios.";
    const mission =
      "Diseña **ofuscación de código** y **protección de binarios** (pipeline build, integridad, anti-tamper resumido).";
    const fewShot =
      '{"result":"Checklist minify + symbol strip","score":90,"recommendations":["Source maps privados","Watermark build"]}';
    return runProteccionIpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getProteccionIpOfuscacionAgent(): ProteccionIpOfuscacionAgent {
  return ProteccionIpOfuscacionAgent.instance();
}

export function resetProteccionIpOfuscacionAgentForTests(): void {
  inst = null;
}
