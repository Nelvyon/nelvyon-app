import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-storytelling";

export class SocialStorytellingAgent {
  private static inst: SocialStorytellingAgent | undefined;

  static get instance(): SocialStorytellingAgent {
    if (!SocialStorytellingAgent.inst) SocialStorytellingAgent.inst = new SocialStorytellingAgent();
    return SocialStorytellingAgent.inst;
  }

  static reset(): void {
    SocialStorytellingAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialLlm();
  }

  async run(input: SocialInput): Promise<SocialOutput> {
    return runSocialAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole:
          "ROLE: Brand storytelling serialized top 1%; capítulos con cliffhanger honesto.",
        mission:
          "Construye narrativa de marca en series/hilos: arco 4–6 partes con titulares de episodio y CTA soft.",
        fewShotExample:
          "Input: historia fundador. Output JSON: outline serie; posts por episodio; hashtags marca+nicho.",
      },
      input,
    );
  }
}

export function getSocialStorytellingAgent(): SocialStorytellingAgent {
  return SocialStorytellingAgent.instance;
}

export function resetSocialStorytellingAgentForTests(): void {
  SocialStorytellingAgent.reset();
}
