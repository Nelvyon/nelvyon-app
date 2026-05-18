import type { ILlmClient } from "../../LlmClient";
import type { SuperiorAttributionInput, SuperiorAttributionOutput } from "./shared";
import { getDefaultSuperiorAttributionLlm, runSuperiorAttributionAgentCore } from "./shared";

const AGENT_ID = "superiorattribution-channel";

export class SuperiorAttributionChannelAgent {
  private static inst: SuperiorAttributionChannelAgent | undefined;

  static get instance(): SuperiorAttributionChannelAgent {
    if (!SuperiorAttributionChannelAgent.inst) SuperiorAttributionChannelAgent.inst = new SuperiorAttributionChannelAgent();
    return SuperiorAttributionChannelAgent.inst;
  }

  static reset(): void {
    SuperiorAttributionChannelAgent.inst = undefined;
  }

  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultSuperiorAttributionLlm();
  }

  async run(input: SuperiorAttributionInput): Promise<SuperiorAttributionOutput> {
    const eliteRole = "Eres **SuperiorAttribution Channel** — atribución por canal.";
    const mission =
      "Atribuye por **paid, organic, email, social, referral y direct** con cobertura omnicanal completa.";
    const fewShot =
      '{"content":"Channel attribution paid organic email social referral direct omnichannel","score":90,"highlights":["Omnichannel coverage","Channel credit"],"metrics":["Channel attribution"]}';
    return runSuperiorAttributionAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input, 0.2);
  }
}

export function getSuperiorAttributionChannelAgent(): SuperiorAttributionChannelAgent {
  return SuperiorAttributionChannelAgent.instance;
}

export function resetSuperiorAttributionChannelAgentForTests(): void {
  SuperiorAttributionChannelAgent.reset();
}
