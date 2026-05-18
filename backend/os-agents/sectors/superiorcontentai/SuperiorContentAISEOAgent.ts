import type { ILlmClient } from "../../LlmClient";
import type { SuperiorContentAIInput, SuperiorContentAIOutput } from "./shared";
import { getDefaultSuperiorContentAILlm, runSuperiorContentAIAgentCore } from "./shared";

const AGENT_ID = "superiorcontentai-seo";

export class SuperiorContentAISEOAgent {
  private static inst: SuperiorContentAISEOAgent | undefined;

  static get instance(): SuperiorContentAISEOAgent {
    if (!SuperiorContentAISEOAgent.inst) SuperiorContentAISEOAgent.inst = new SuperiorContentAISEOAgent();
    return SuperiorContentAISEOAgent.inst;
  }

  static reset(): void {
    SuperiorContentAISEOAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorContentAILlm();
  }

  async run(input: SuperiorContentAIInput): Promise<SuperiorContentAIOutput> {
    const eliteRole = "Eres **SuperiorContentAI SEO** — SEO por pieza.";
    const mission =
      "Optimiza **keywords, entidades, estructura e internal linking** en cada pieza sin perder voz de marca.";
    const fewShot =
      '{"content":"Per-piece SEO keywords entities structure internal linking","score":89,"highlights":["Entity SEO","Internal links"],"metrics":["SEO coverage"]}';
    return runSuperiorContentAIAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorContentAISEOAgent(): SuperiorContentAISEOAgent {
  return SuperiorContentAISEOAgent.instance;
}

export function resetSuperiorContentAISEOAgentForTests(): void {
  SuperiorContentAISEOAgent.reset();
}
