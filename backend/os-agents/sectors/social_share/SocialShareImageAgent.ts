import type { ILlmClient } from "../../LlmClient";
import type { SocialShareInput, SocialShareOutput } from "./shared";
import { getDefaultSocialShareLlm, runSocialShareAgentCore } from "./shared";

const AGENT_ID = "social-share-image";

export class SocialShareImageAgent {
  private static inst: SocialShareImageAgent | undefined;

  static get instance(): SocialShareImageAgent {
    if (!SocialShareImageAgent.inst) SocialShareImageAgent.inst = new SocialShareImageAgent();
    return SocialShareImageAgent.inst;
  }

  static reset(): void {
    SocialShareImageAgent.inst = undefined;
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
        eliteRole: "ROLE: Visual growth designer top 1%; OG 1200×630 + safe zones por red.",
        mission:
          "Especifica composición de imagen/card con métricas del cliente, marca y QR/link referral visible (sin datos inventados).",
        fewShotExample:
          '{"content":"Layout 3 bloques: KPI hero, sparkline textual, footer con referral truncado.","score":90,"highlights":["Paleta marca + contraste AA","QR opcional esquina"],"metrics":["Aspect 1.91:1 OG","Safe zone 90px inferior"]}',
      },
      input,
      0.9,
    );
  }
}

export function getSocialShareImageAgent(): SocialShareImageAgent {
  return SocialShareImageAgent.instance;
}

export function resetSocialShareImageAgentForTests(): void {
  SocialShareImageAgent.reset();
}
