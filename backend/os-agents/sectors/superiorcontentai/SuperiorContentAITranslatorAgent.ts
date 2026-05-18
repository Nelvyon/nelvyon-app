import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-translator";

export class SuperiorContentAITranslatorAgent {
  private static inst: SuperiorContentAITranslatorAgent | undefined;

  static get instance(): SuperiorContentAITranslatorAgent {
    if (!SuperiorContentAITranslatorAgent.inst) SuperiorContentAITranslatorAgent.inst = new SuperiorContentAITranslatorAgent();
    return SuperiorContentAITranslatorAgent.inst;
  }

  static reset(): void {
    SuperiorContentAITranslatorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI Translator** — traducción y localización.";
    const mission =
      "Traduce y localiza culturalmente a **20+ idiomas** manteniendo voz de marca; entrega **<45s**.";
    const fewShot =
      '{"content":"20+ language cultural localization brand voice <45s","score":88,"highlights":["20+ languages","Brand voice preserved"],"metrics":["Translation latency"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.5);
  }
}

export function getSuperiorContentAITranslatorAgent(): SuperiorContentAITranslatorAgent {
  return SuperiorContentAITranslatorAgent.instance;
}

export function resetSuperiorContentAITranslatorAgentForTests(): void {
  SuperiorContentAITranslatorAgent.reset();
}
