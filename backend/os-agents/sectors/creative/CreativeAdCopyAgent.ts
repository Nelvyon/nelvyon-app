import type { ILlmClient } from "../../LlmClient";
import type { CreativeInput, CreativeOutput } from "./shared";
import { getDefaultCreativeLlm, runCreativeAgentCore } from "./shared";

const AGENT_ID = "creative-ad-copy";

export class CreativeAdCopyAgent {
  private static inst: CreativeAdCopyAgent | undefined;

  static get instance(): CreativeAdCopyAgent {
    if (!CreativeAdCopyAgent.inst) CreativeAdCopyAgent.inst = new CreativeAdCopyAgent();
    return CreativeAdCopyAgent.inst;
  }

  static reset(): void {
    CreativeAdCopyAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCreativeLlm();
  }

  async run(input: CreativeInput): Promise<CreativeOutput> {
    return runCreativeAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Performance copy chief multicanal top 1%; compliance y límites de caracteres orientativos.",
        mission:
          "Genera copy publicitario para Google Ads, Meta Ads y display: headlines, textos largos y variantes display.",
        fewShotExample:
          "Input: campaña captación. Output JSON: RSA headlines grupos; variants body Meta; formats RSA PMax Display.",
      },
      input,
    );
  }
}

export function getCreativeAdCopyAgent(): CreativeAdCopyAgent {
  return CreativeAdCopyAgent.instance;
}

export function resetCreativeAdCopyAgentForTests(): void {
  CreativeAdCopyAgent.reset();
}
