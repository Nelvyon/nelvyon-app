import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-search";

export class KnowledgeBaseAISearchAgent {
  private static inst: KnowledgeBaseAISearchAgent | undefined;

  static get instance(): KnowledgeBaseAISearchAgent {
    if (!KnowledgeBaseAISearchAgent.inst) KnowledgeBaseAISearchAgent.inst = new KnowledgeBaseAISearchAgent();
    return KnowledgeBaseAISearchAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAISearchAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Search** — búsqueda semántica de KB.";
    const mission =
      "Encuentra la **respuesta exacta** aunque la pregunta esté mal formulada; respuesta en **<1 segundo**.";
    const fewShot =
      '{"content":"Search: semántica, respuesta exacta, pregunta mal formulada, <1s","score":90,"highlights":["<1s",">70% self-service"],"metrics":["Search latency"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getKnowledgeBaseAISearchAgent(): KnowledgeBaseAISearchAgent {
  return KnowledgeBaseAISearchAgent.instance;
}

export function resetKnowledgeBaseAISearchAgentForTests(): void {
  KnowledgeBaseAISearchAgent.reset();
}
