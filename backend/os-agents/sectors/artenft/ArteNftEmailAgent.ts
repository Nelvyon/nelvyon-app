import type { ILlmClient } from "../../LlmClient";
import type { ArteNftInput, ArteNftOutput } from "./shared";
import { getDefaultArteNftLlm, runArteNftAgentCore } from "./shared";

const AGENT_ID = "artenft-email";

let inst: ArteNftEmailAgent | null = null;

export class ArteNftEmailAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): ArteNftEmailAgent {
    if (!inst) inst = new ArteNftEmailAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultArteNftLlm();
  }

  async run(input: ArteNftInput): Promise<ArteNftOutput> {
    const eliteRole = "Eres **Arte NFT Email** — coleccionistas y drops.";
    const mission =
      "Diseña **email a coleccionistas** y **drops exclusivos** (allowlist, preview, post-mint nurture).";
    const fewShot =
      '{"result":"Secuencia allowlist 3 mails","score":91,"recommendations":["Segment VIP","UTM drop"]}';
    return runArteNftAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getArteNftEmailAgent(): ArteNftEmailAgent {
  return ArteNftEmailAgent.instance();
}

export function resetArteNftEmailAgentForTests(): void {
  inst = null;
}
