import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-comunidad";

let inst: ArteNftComunidadAgent | null = null;

export class ArteNftComunidadAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftComunidadAgent {
    if (!inst) inst = new ArteNftComunidadAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Comunidad** — coleccionistas y fans.";
    const mission =
      "Diseña **comunidad de coleccionistas y fans** (Discord, holders, eventos IRL/virtuales, feedback loop).";
    const fewShot =
      '{"result":"Roles holders + AMA mensual","score":92,"recommendations":["Allowlist loyal","Studio diary"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftComunidadAgent(): ArteNftComunidadAgent {
  return ArteNftComunidadAgent.instance();
}

export function resetArteNftComunidadAgentForTests(): void {
  inst = null;
}
