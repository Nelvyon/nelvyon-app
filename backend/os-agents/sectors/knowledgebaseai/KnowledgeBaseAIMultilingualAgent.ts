import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-multilingual";

export class KnowledgeBaseAIMultilingualAgent {
  private static inst: KnowledgeBaseAIMultilingualAgent | undefined;

  static get instance(): KnowledgeBaseAIMultilingualAgent {
    if (!KnowledgeBaseAIMultilingualAgent.inst)
      KnowledgeBaseAIMultilingualAgent.inst = new KnowledgeBaseAIMultilingualAgent();
    return KnowledgeBaseAIMultilingualAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIMultilingualAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Multilingual** — traducción automática de KB.";
    const mission =
      "Traduce KB a **40+ idiomas** con **sincronización** de cambios entre locales.";
    const fewShot =
      '{"content":"Multilingual: 40+ idiomas, sync cambios automática","score":86,"highlights":["40+ idiomas","Sync"],"metrics":["Locales synced"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.4);
  }
}

export function getKnowledgeBaseAIMultilingualAgent(): KnowledgeBaseAIMultilingualAgent {
  return KnowledgeBaseAIMultilingualAgent.instance;
}

export function resetKnowledgeBaseAIMultilingualAgentForTests(): void {
  KnowledgeBaseAIMultilingualAgent.reset();
}
