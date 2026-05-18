import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-viral";

export class SocialShareViralAgent {
  private static inst: SocialShareViralAgent | undefined;

  static get instance(): SocialShareViralAgent {
    if (!SocialShareViralAgent.inst) SocialShareViralAgent.inst = new SocialShareViralAgent();
    return SocialShareViralAgent.inst;
  }

  static reset(): void {
    SocialShareViralAgent.inst = undefined;
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
        eliteRole: "ROLE: Growth hacker top 1%; amplificación responsable del spend.",
        mission:
          "Si >500 clicks en 24h en URL del share: activa amplificación automática con boost de presupuesto y creatividades derivadas.",
        fewShotExample:
          '{"content":"Umbral 500/24h cumplido → duplicar spend boost 48h en red de mayor CTR.","score":87,"highlights":["Guardrail CPA máx","Pausa si fraude referral"],"metrics":["Ventana rolling 24h UTC","Cap diario €"]}',
      },
      input,
      0.5,
    );
  }
}

export function getSocialShareViralAgent(): SocialShareViralAgent {
  return SocialShareViralAgent.instance;
}

export function resetSocialShareViralAgentForTests(): void {
  SocialShareViralAgent.reset();
}
