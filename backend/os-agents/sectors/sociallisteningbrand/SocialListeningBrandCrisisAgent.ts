import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-crisis";

export class SocialListeningBrandCrisisAgent {
  private static inst: SocialListeningBrandCrisisAgent | undefined;

  static get instance(): SocialListeningBrandCrisisAgent {
    if (!SocialListeningBrandCrisisAgent.inst) SocialListeningBrandCrisisAgent.inst = new SocialListeningBrandCrisisAgent();
    return SocialListeningBrandCrisisAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandCrisisAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Crisis** — gestión de crisis reputacional.";
    const mission =
      "Detecta crisis y activa **protocolo de respuesta automático**; alerta y activación **<2 min**.";
    const fewShot =
      '{"content":"Crisis: alerta <2 min, protocolo respuesta automático","score":88,"highlights":["<2 min","Auto protocol"],"metrics":["Crisis response time"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSocialListeningBrandCrisisAgent(): SocialListeningBrandCrisisAgent {
  return SocialListeningBrandCrisisAgent.instance;
}

export function resetSocialListeningBrandCrisisAgentForTests(): void {
  SocialListeningBrandCrisisAgent.reset();
}
