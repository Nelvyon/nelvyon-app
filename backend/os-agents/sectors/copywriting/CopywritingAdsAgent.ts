import type { ILlmClient } from "../../LlmClient";
import type { CopywritingInput, CopywritingOutput } from "./shared";
import { getDefaultCopywritingLlm, runCopywritingAgentCore } from "./shared";

const AGENT_ID = "copywriting-ads";

let inst: CopywritingAdsAgent | null = null;

export class CopywritingAdsAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): CopywritingAdsAgent {
    if (!inst) inst = new CopywritingAdsAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCopywritingLlm();
  }

  async run(input: CopywritingInput): Promise<CopywritingOutput> {
    const eliteRole = "Eres **Copywriting Ads** — paid social + search.";
    const mission =
      "Crea **anuncios** Google / Meta / TikTok (headlines, descriptions, hooks cortos, extensiones, compliance básico).";
    const fewShot =
      '{"result":"Pack RSA + 3 hooks TikTok","score":88,"recommendations":["UTM naming","Límite caracteres","Disclaimer sector"]}';
    return runCopywritingAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getCopywritingAdsAgent(): CopywritingAdsAgent {
  return CopywritingAdsAgent.instance();
}

export function resetCopywritingAdsAgentForTests(): void {
  inst = null;
}
