import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-writer";

export class SuperiorContentAIWriterAgent {
  private static inst: SuperiorContentAIWriterAgent | undefined;

  static get instance(): SuperiorContentAIWriterAgent {
    if (!SuperiorContentAIWriterAgent.inst) SuperiorContentAIWriterAgent.inst = new SuperiorContentAIWriterAgent();
    return SuperiorContentAIWriterAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIWriterAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Writer** — redacción con voz de marca.";
    const mission =
      "Redacta **artículos, posts, newsletters y scripts** con voz de marca y **E-E-A-T >90**; 2000 palabras **<30s**.";
    const fewShot =
      '{"content":"Brand-voice articles posts newsletters scripts E-E-A-T 90+ <30s","score":91,"highlights":["E-E-A-T 90+","<30s 2000 words"],"metrics":["E-E-A-T score"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.8);
  }
}

export function getSuperiorContentAIWriterAgent(): SuperiorContentAIWriterAgent {
  return SuperiorContentAIWriterAgent.instance;
}

export function resetSuperiorContentAIWriterAgentForTests(): void {
  SuperiorContentAIWriterAgent.reset();
}
