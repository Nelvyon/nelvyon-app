import type { ILlmClient } from "../../LlmClient";
import type { SocialListeningBrandInput, SocialListeningBrandOutput } from "./shared";
import { getDefaultSocialListeningBrandLlm, runSocialListeningBrandAgentCore } from "./shared";

const AGENT_ID = "sociallisteningbrand-monitor";

export class SocialListeningBrandMonitorAgent {
  private static inst: SocialListeningBrandMonitorAgent | undefined;

  static get instance(): SocialListeningBrandMonitorAgent {
    if (!SocialListeningBrandMonitorAgent.inst) SocialListeningBrandMonitorAgent.inst = new SocialListeningBrandMonitorAgent();
    return SocialListeningBrandMonitorAgent.inst;
  }

  static reset(): void {
    SocialListeningBrandMonitorAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSocialListeningBrandLlm();
  }

  async run(input: SocialListeningBrandInput): Promise<SocialListeningBrandOutput> {
    const eliteRole = "Eres **SocialListeningBrand Monitor** — monitoreo de menciones en tiempo real.";
    const mission =
      "Rastrea menciones en **RRSS**, **foros**, **blogs** y **noticias**; detección **<2 min** en **50+ fuentes**.";
    const fewShot =
      '{"content":"Monitor: RRSS, foros, blogs, noticias, <2 min, 50+ fuentes","score":93,"highlights":["<2 min","50+ fuentes"],"metrics":["Mention latency"]}';
    return runSocialListeningBrandAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSocialListeningBrandMonitorAgent(): SocialListeningBrandMonitorAgent {
  return SocialListeningBrandMonitorAgent.instance;
}

export function resetSocialListeningBrandMonitorAgentForTests(): void {
  SocialListeningBrandMonitorAgent.reset();
}
