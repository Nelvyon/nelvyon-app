import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-ingest";

export class KnowledgeBaseAIIngestAgent {
  private static inst: KnowledgeBaseAIIngestAgent | undefined;

  static get instance(): KnowledgeBaseAIIngestAgent {
    if (!KnowledgeBaseAIIngestAgent.inst) KnowledgeBaseAIIngestAgent.inst = new KnowledgeBaseAIIngestAgent();
    return KnowledgeBaseAIIngestAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIIngestAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Ingest** — ingesta de contenido para KB.";
    const mission =
      "Ingesta **URLs**, **PDFs**, **docs**, **vídeos**, **FAQs** y **bases de datos** de la empresa.";
    const fewShot =
      '{"content":"Ingest: URLs, PDFs, docs, vídeos, FAQs, DB empresa","score":93,"highlights":["Multi-fuente",">95% FAQ"],"metrics":["Sources ingested"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getKnowledgeBaseAIIngestAgent(): KnowledgeBaseAIIngestAgent {
  return KnowledgeBaseAIIngestAgent.instance;
}

export function resetKnowledgeBaseAIIngestAgentForTests(): void {
  KnowledgeBaseAIIngestAgent.reset();
}
