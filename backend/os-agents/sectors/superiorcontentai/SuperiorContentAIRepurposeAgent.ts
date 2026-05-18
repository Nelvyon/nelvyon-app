import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-repurpose";

export class SuperiorContentAIRepurposeAgent {
  private static inst: SuperiorContentAIRepurposeAgent | undefined;

  static get instance(): SuperiorContentAIRepurposeAgent {
    if (!SuperiorContentAIRepurposeAgent.inst) SuperiorContentAIRepurposeAgent.inst = new SuperiorContentAIRepurposeAgent();
    return SuperiorContentAIRepurposeAgent.inst;
  }

  static reset(): void {
    SuperiorContentAIRepurposeAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Repurpose** — repurposing multi-formato.";
    const mission =
      "Repurpose automático: **artículo → post RRSS → newsletter → script vídeo → thread X**; **6 formatos <60s**.";
    const fewShot =
      '{"content":"Article to social newsletter video script X thread 6 formats <60s","score":90,"highlights":["6 formats <60s","Multi-channel repurpose"],"metrics":["Repurpose latency"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.7);
  }
}

export function getSuperiorContentAIRepurposeAgent(): SuperiorContentAIRepurposeAgent {
  return SuperiorContentAIRepurposeAgent.instance;
}

export function resetSuperiorContentAIRepurposeAgentForTests(): void {
  SuperiorContentAIRepurposeAgent.reset();
}
