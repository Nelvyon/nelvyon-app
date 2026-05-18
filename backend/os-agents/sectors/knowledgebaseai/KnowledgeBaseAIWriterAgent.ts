import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-writer";

export class KnowledgeBaseAIWriterAgent {
  private static inst: KnowledgeBaseAIWriterAgent | undefined;

  static get instance(): KnowledgeBaseAIWriterAgent {
    if (!KnowledgeBaseAIWriterAgent.inst) KnowledgeBaseAIWriterAgent.inst = new KnowledgeBaseAIWriterAgent();
    return KnowledgeBaseAIWriterAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIWriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Writer** — generación de artículos KB.";
    const mission =
      "Genera artículos desde **tickets**, **conversaciones** y **documentos internos** en **<30 segundos**.";
    const fewShot =
      '{"content":"Writer: artículos desde tickets, conversaciones, docs, <30s","score":91,"highlights":["<30s",">95% FAQ"],"metrics":["Article generation time"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getKnowledgeBaseAIWriterAgent(): KnowledgeBaseAIWriterAgent {
  return KnowledgeBaseAIWriterAgent.instance;
}

export function resetKnowledgeBaseAIWriterAgentForTests(): void {
  KnowledgeBaseAIWriterAgent.reset();
}
