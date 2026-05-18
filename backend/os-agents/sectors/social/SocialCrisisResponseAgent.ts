import type { ILlmClient } from "../../LlmClient";
import type { SocialInput, SocialOutput } from "./shared";
import { getDefaultSocialLlm, runSocialAgentCore } from "./shared";

const AGENT_ID = "social-crisis-response";

export class SocialCrisisResponseAgent {
  private static inst: SocialCrisisResponseAgent | undefined;

  static get instance(): SocialCrisisResponseAgent {
    if (!SocialCrisisResponseAgent.inst) SocialCrisisResponseAgent.inst = new SocialCrisisResponseAgent();
    return SocialCrisisResponseAgent.inst;
  }

  static reset(): void {
    SocialCrisisResponseAgent.inst = undefined;
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
          "ROLE: Crisis comms RRSS top 1%; respuesta firme, empática y verificable.",
        mission:
          "Genera respuestas de gestión de crisis: post holding, respuesta comentario tipo, DM plantilla interna resumida.",
        fewShotExample:
          "Input: queja masiva servicio. Output JSON: tono calmado; posts borrador y versión corta; hashtags solo marca.",
      },
      input,
    );
  }
}

export function getSocialCrisisResponseAgent(): SocialCrisisResponseAgent {
  return SocialCrisisResponseAgent.instance;
}

export function resetSocialCrisisResponseAgentForTests(): void {
  SocialCrisisResponseAgent.reset();
}
