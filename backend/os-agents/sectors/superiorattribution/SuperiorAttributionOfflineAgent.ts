import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-offline";

export class SuperiorAttributionOfflineAgent {
  private static inst: SuperiorAttributionOfflineAgent | undefined;

  static get instance(): SuperiorAttributionOfflineAgent {
    if (!SuperiorAttributionOfflineAgent.inst) SuperiorAttributionOfflineAgent.inst = new SuperiorAttributionOfflineAgent();
    return SuperiorAttributionOfflineAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionOfflineAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Offline** — atribución offline.";
    const mission =
      "Atribuye **llamadas, eventos y visitas a tienda** integrando online + offline omnicanal.";
    const fewShot =
      '{"content":"Offline calls events store visits omnichannel online offline attribution","score":88,"highlights":["Offline touchpoints","Omnichannel"],"metrics":["Offline coverage"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.3);
  }
}

export function getSuperiorAttributionOfflineAgent(): SuperiorAttributionOfflineAgent {
  return SuperiorAttributionOfflineAgent.instance;
}

export function resetSuperiorAttributionOfflineAgentForTests(): void {
  SuperiorAttributionOfflineAgent.reset();
}
