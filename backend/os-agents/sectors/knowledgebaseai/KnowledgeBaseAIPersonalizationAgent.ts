import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-personalization";

export class KnowledgeBaseAIPersonalizationAgent {
  private static inst: KnowledgeBaseAIPersonalizationAgent | undefined;

  static get instance(): KnowledgeBaseAIPersonalizationAgent {
    if (!KnowledgeBaseAIPersonalizationAgent.inst)
      KnowledgeBaseAIPersonalizationAgent.inst = new KnowledgeBaseAIPersonalizationAgent();
    return KnowledgeBaseAIPersonalizationAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIPersonalizationAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Personalization** — KB personalizada por cliente.";
    const mission =
      "Personaliza contenido por **rol**, **sector** y **plan** del cliente para self-service **>70%**.";
    const fewShot =
      '{"content":"Personalization: por rol, sector, plan, >70% self-service","score":87,"highlights":["Por rol",">70% self"],"metrics":["Personalized views"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getKnowledgeBaseAIPersonalizationAgent(): KnowledgeBaseAIPersonalizationAgent {
  return KnowledgeBaseAIPersonalizationAgent.instance;
}

export function resetKnowledgeBaseAIPersonalizationAgentForTests(): void {
  KnowledgeBaseAIPersonalizationAgent.reset();
}
