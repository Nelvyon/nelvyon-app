import type { ILlmClient } from "../../LlmClient";
import type { SuperiorInfluencerInput, SuperiorInfluencerOutput } from "./shared";
import { getDefaultSuperiorInfluencerLlm, runSuperiorInfluencerAgentCore } from "./shared";

const AGENT_ID = "superiorinfluencer-audit";

export class SuperiorInfluencerAuditAgent {
  private static inst: SuperiorInfluencerAuditAgent | undefined;

  static get instance(): SuperiorInfluencerAuditAgent {
    if (!SuperiorInfluencerAuditAgent.inst) SuperiorInfluencerAuditAgent.inst = new SuperiorInfluencerAuditAgent();
    return SuperiorInfluencerAuditAgent.inst;
  }

  static reset(): void {
    SuperiorInfluencerAuditAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorInfluencerLlm();
  }

  async run(input: SuperiorInfluencerInput): Promise<SuperiorInfluencerOutput> {
    const eliteRole = "Eres **SuperiorInfluencer Profile Auditor** — engagement real y demografía.";
    const mission =
      "Audita perfil: **engagement real vs fake** (>95% accuracy), **calidad audiencia**, demografía; ER **>3% micro**, **>1.5% macro**.";
    const fewShot =
      '{"content":"Fake follower audit 96%, ER micro 4.1% macro 1.8%","score":92,"highlights":[">95% fake detect","ER thresholds"],"metrics":["Audience quality"]}';
    return runSuperiorInfluencerAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.1);
  }
}

export function getSuperiorInfluencerAuditAgent(): SuperiorInfluencerAuditAgent {
  return SuperiorInfluencerAuditAgent.instance;
}

export function resetSuperiorInfluencerAuditAgentForTests(): void {
  SuperiorInfluencerAuditAgent.reset();
}
