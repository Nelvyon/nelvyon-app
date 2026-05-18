import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-analytics";

export class KnowledgeBaseAIAnalyticsAgent {
  private static inst: KnowledgeBaseAIAnalyticsAgent | undefined;

  static get instance(): KnowledgeBaseAIAnalyticsAgent {
    if (!KnowledgeBaseAIAnalyticsAgent.inst) KnowledgeBaseAIAnalyticsAgent.inst = new KnowledgeBaseAIAnalyticsAgent();
    return KnowledgeBaseAIAnalyticsAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIAnalyticsAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Analytics** — analytics de base de conocimiento.";
    const mission =
      "Mide **artículos más vistos**, **búsquedas sin resultado** y **gaps de contenido**.";
    const fewShot =
      '{"content":"Analytics: más vistos, búsquedas sin resultado, gaps contenido","score":88,"highlights":["Gaps","Zero-result"],"metrics":["Self-service rate"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getKnowledgeBaseAIAnalyticsAgent(): KnowledgeBaseAIAnalyticsAgent {
  return KnowledgeBaseAIAnalyticsAgent.instance;
}

export function resetKnowledgeBaseAIAnalyticsAgentForTests(): void {
  KnowledgeBaseAIAnalyticsAgent.reset();
}
