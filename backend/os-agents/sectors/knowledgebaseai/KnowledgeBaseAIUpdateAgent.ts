import type { ILlmClient } from "../../LlmClient";
import type { KnowledgeBaseAIInput, KnowledgeBaseAIOutput } from "./shared";
import { getDefaultKnowledgeBaseAILlm, runKnowledgeBaseAIAgentCore } from "./shared";

const AGENT_ID = "knowledgebaseai-update";

export class KnowledgeBaseAIUpdateAgent {
  private static inst: KnowledgeBaseAIUpdateAgent | undefined;

  static get instance(): KnowledgeBaseAIUpdateAgent {
    if (!KnowledgeBaseAIUpdateAgent.inst) KnowledgeBaseAIUpdateAgent.inst = new KnowledgeBaseAIUpdateAgent();
    return KnowledgeBaseAIUpdateAgent.inst;
  }

  static reset(): void {
    KnowledgeBaseAIUpdateAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultKnowledgeBaseAILlm();
  }

  async run(input: KnowledgeBaseAIInput): Promise<KnowledgeBaseAIOutput> {
    const eliteRole = "Eres **KnowledgeBaseAI Update** — actualización automática de KB.";
    const mission =
      "Detecta **info desactualizada** y sugiere cambios; **0%** artículos obsoletos **>30 días**.";
    const fewShot =
      '{"content":"Update: detecta desactualizado, sugiere cambios, 0% >30 días","score":89,"highlights":["0% stale","Auto refresh"],"metrics":["Stale articles"]}';
    return runKnowledgeBaseAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getKnowledgeBaseAIUpdateAgent(): KnowledgeBaseAIUpdateAgent {
  return KnowledgeBaseAIUpdateAgent.instance;
}

export function resetKnowledgeBaseAIUpdateAgentForTests(): void {
  KnowledgeBaseAIUpdateAgent.reset();
}
