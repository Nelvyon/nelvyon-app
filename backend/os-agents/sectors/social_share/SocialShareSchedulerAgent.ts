import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-scheduler";

export class SocialShareSchedulerAgent {
  private static inst: SocialShareSchedulerAgent | undefined;

  static get instance(): SocialShareSchedulerAgent {
    if (!SocialShareSchedulerAgent.inst) SocialShareSchedulerAgent.inst = new SocialShareSchedulerAgent();
    return SocialShareSchedulerAgent.inst;
  }

  static reset(): void {
    SocialShareSchedulerAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialShareLlm();
  }

  async run(input: SocialShareInput): Promise<SocialShareOutput> {
    return runSocialShareAgentCore(
      AGENT_ID,
      this.llm,
      {
        eliteRole: "ROLE: Publishing ops top 1%; cron por TZ del público objetivo.",
        mission:
          "Programa publicaciones automáticas en mejor horario por red y sector; evita solapes y fatiga.",
        fewShotExample:
          '{"content":"Ventanas LI ma-jue 8–9h local; IG reel slot 18–20h.","score":86,"highlights":["Cola job idempotente","Backoff si API rate limit"],"metrics":["Frecuencia máx 3/semana por red"]}',
      },
      input,
      0.2,
    );
  }
}

export function getSocialShareSchedulerAgent(): SocialShareSchedulerAgent {
  return SocialShareSchedulerAgent.instance;
}

export function resetSocialShareSchedulerAgentForTests(): void {
  SocialShareSchedulerAgent.reset();
}
