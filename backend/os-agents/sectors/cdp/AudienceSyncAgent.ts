import type { ILlmClient } from "../../LlmClient";
import type { CdpInput, CdpOutput } from "./shared";
import { getDefaultCdpLlm, runCdpAgentCore } from "./shared";

const AGENT_ID = "cdp-audiencesync";

export class AudienceSyncAgent {
  private static inst: AudienceSyncAgent | undefined;

  static get instance(): AudienceSyncAgent {
    if (!AudienceSyncAgent.inst) AudienceSyncAgent.inst = new AudienceSyncAgent();
    return AudienceSyncAgent.inst;
  }

  static reset(): void {
    AudienceSyncAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultCdpLlm();
  }

  async run(input: CdpInput): Promise<CdpOutput> {
    const eliteRole = "Eres **Audience Sync** — sincronización de audiencias a ads.";
    const mission =
      "Sincroniza audiencias a **Meta, Google, TikTok y LinkedIn** de forma **automática** en **<5 minutos**.";
    const fewShot =
      '{"content":"Audience sync: Meta/Google/TikTok/LinkedIn, <5 min, automático","score":95,"highlights":["<5 min sync","4 plataformas"],"metrics":["Audience sync latency"]}';
    return runCdpAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.35);
  }
}

export function getAudienceSyncAgent(): AudienceSyncAgent {
  return AudienceSyncAgent.instance;
}

export function resetAudienceSyncAgentForTests(): void {
  AudienceSyncAgent.reset();
}
