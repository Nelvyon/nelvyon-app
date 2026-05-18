import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-template";

export class SocialShareTemplateAgent {
  private static inst: SocialShareTemplateAgent | undefined;

  static get instance(): SocialShareTemplateAgent {
    if (!SocialShareTemplateAgent.inst) SocialShareTemplateAgent.inst = new SocialShareTemplateAgent();
    return SocialShareTemplateAgent.inst;
  }

  static reset(): void {
    SocialShareTemplateAgent.inst = undefined;
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
        eliteRole: "ROLE: Template systems designer top 1%; librería por sector sin drift de marca.",
        mission:
          "Gestiona plantillas reutilizables (slots KPI, tone, legal footer) por sector y actualiza versioning.",
        fewShotExample:
          '{"content":"Plantilla SaaS ‘Win of the week’ + slot referral obligatorio.","score":89,"highlights":["Semver plantilla","Fallback si falta métrica"],"metrics":["12 templates sector retail vs SaaS"]}',
      },
      input,
      0.9,
    );
  }
}

export function getSocialShareTemplateAgent(): SocialShareTemplateAgent {
  return SocialShareTemplateAgent.instance;
}

export function resetSocialShareTemplateAgentForTests(): void {
  SocialShareTemplateAgent.reset();
}
