import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-organize";

export class KnowledgeBaseAIOrganizeAgent {
  private static inst: KnowledgeBaseAIOrganizeAgent | undefined;

  static get instance(): KnowledgeBaseAIOrganizeAgent {
    if (!KnowledgeBaseAIOrganizeAgent.inst) KnowledgeBaseAIOrganizeAgent.inst = new KnowledgeBaseAIOrganizeAgent();
    return KnowledgeBaseAIOrganizeAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIOrganizeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Organize** — organización automática de KB.";
    const mission =
      "Estructura **categorías**, **tags**, **jerarquía** y **relaciones** entre artículos.";
    const fewShot =
      '{"content":"Organize: categorías, tags, jerarquía, relaciones artículos","score":92,"highlights":["Jerarquía","Tags"],"metrics":["Taxonomy coverage"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getKnowledgeBaseAIOrganizeAgent(): KnowledgeBaseAIOrganizeAgent {
  return KnowledgeBaseAIOrganizeAgent.instance;
}

export function resetKnowledgeBaseAIOrganizeAgentForTests(): void {
  KnowledgeBaseAIOrganizeAgent.reset();
}
