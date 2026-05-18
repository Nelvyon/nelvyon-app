import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-precios";

let inst: ArteNftPreciosAgent | null = null;

export class ArteNftPreciosAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftPreciosAgent {
    if (!inst) inst = new ArteNftPreciosAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Precios** — obras, ediciones y NFTs.";
    const mission =
      "Diseña **pricing** de obras, **ediciones limitadas** y **NFTs** (reservas, royalties, bundles físico+digital).";
    const fewShot =
      '{"result":"Matriz 1/1 vs editions + floor guidance","score":91,"recommendations":["Edición firmada","Utility ligera"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftPreciosAgent(): ArteNftPreciosAgent {
  return ArteNftPreciosAgent.instance();
}

export function resetArteNftPreciosAgentForTests(): void {
  inst = null;
}
